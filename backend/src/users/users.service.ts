import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  ScanCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb';
import { DYNAMODB_CLIENT } from '../database/database.module';
import { User, UserRole } from './user.interface';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

@Injectable()
export class UsersService {
  private readonly tableName: string;
  private readonly saltRounds = 10;

  constructor(
    @Inject(DYNAMODB_CLIENT) private dynamoDbClient: DynamoDBDocumentClient,
    private configService: ConfigService,
  ) {
    const tableNameFromConfig = this.configService.get<string>(
      'DYNAMODB_TABLE_NAME',
    );
    console.log(
      '<<< DEBUG: Value for DYNAMODB_TABLE_NAME = >>>',
      tableNameFromConfig,
      '>>>',
    );
    if (!tableNameFromConfig) {
      throw new Error(
        'DynamoDB table name (DYNAMODB_TABLE_NAME) not set in config .env .',
      );
    }
    this.tableName = tableNameFromConfig;
  }

  // --- CREATE ---
  // Use CreateUserDto for input type
  async create(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    if (!createUserDto.email || !createUserDto.password) {
      throw new BadRequestException('Email and password are required.');
    }

    const existingUser = await this.findOneByEmail(createUserDto.email);
    if (existingUser) {
      throw new ConflictException('Email already registered.');
    }

    const userId = uuidv4();
    const hashedPassword = await bcrypt.hash(
      createUserDto.password,
      this.saltRounds,
    );
    const now = new Date().toISOString();

    const userItem: User = {
      userId: userId,
      email: createUserDto.email.toLowerCase(),
      passwordHash: hashedPassword,
      firstName: createUserDto.firstName || '',
      lastName: createUserDto.lastName || '',
      role: createUserDto.role || UserRole.ADMIN, // Use role from DTO or default
      isDisabled: false, // Default isDisabled on creation
      createdAt: now,
      updatedAt: now,
      avatarUrl: createUserDto.avatarUrl,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: userItem,
      ConditionExpression: 'attribute_not_exists(userId)',
    });

    try {
      await this.dynamoDbClient.send(command);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = userItem;
      return result;
    } catch (error: unknown) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new InternalServerErrorException(
          'Failed to create user due to ID conflict.',
        );
      }
      console.error('Error creating user:', error);
      throw new InternalServerErrorException('Could not create user.');
    }
  }

  // --- READ ---
  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    const command = new ScanCommand({
      TableName: this.tableName,
      ProjectionExpression:
        'userId, email, firstName, lastName, #rl, isDisabled, createdAt, updatedAt, avatarUrl',
      ExpressionAttributeNames: { '#rl': 'role' },
    });

    try {
      const result = await this.dynamoDbClient.send(command);
      return (result.Items as Omit<User, 'passwordHash'>[]) || [];
    } catch (error) {
      console.error('Error finding all users:', error);
      throw new InternalServerErrorException('Could not retrieve users.');
    }
  }

  // Returns User or null
  async findOneById(userId: string): Promise<User | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { userId: userId },
    });

    try {
      const result = await this.dynamoDbClient.send(command);
      return (result.Item as User) || null;
    } catch (error) {
      console.error(`Error finding user by ID ${userId}:`, error);
      return null;
    }
  }

  // Throws NotFoundException if user is not found
  async findOneByIdOrFail(userId: string): Promise<User> {
    const user = await this.findOneById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }
    return user;
  }

  // Returns User or null
  async findOneByEmail(email: string): Promise<User | null> {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: 'EmailIndex',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email.toLowerCase() },
      Limit: 1,
    });

    try {
      const result = await this.dynamoDbClient.send(command);
      if (result.Items && result.Items.length > 0) {
        return result.Items[0] as User;
      }
      return null;
    } catch (error) {
      console.error(`Error finding user by email ${email}:`, error);
      return null;
    }
  }

  // Throws NotFoundException if user is not found
  async findOneByEmailOrFail(email: string): Promise<User> {
    const user = await this.findOneByEmail(email);
    if (!user) {
      throw new NotFoundException(`User with email "${email}" not found`);
    }
    return user;
  }

  // --- UPDATE ---
  // Use UpdateUserDto for input type
  async update(
    userId: string,
    updateUserDto: UpdateUserDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const now = new Date().toISOString();
    let updateExpression = 'SET updatedAt = :ua';
    const expressionAttributeValues: Record<string, any> = { ':ua': now };
    const expressionAttributeNames: Record<string, string> = {};

    // Build update expression from DTO fields
    for (const [key, value] of Object.entries(updateUserDto)) {
      // Skip password, handle it separately if present
      if (key === 'password') continue;

      // Only include keys that are actually present in the DTO
      if (value !== undefined) {
        let attrNameKey = key;
        // Handle reserved keywords
        if (key === 'role') {
          expressionAttributeNames['#rl'] = 'role';
          attrNameKey = '#rl';
        }
        if (key === 'isDisabled') {
          expressionAttributeNames['#disabled'] = 'isDisabled';
          attrNameKey = '#disabled';
        }
        // Add other reserved keyword mappings if needed

        const valueKey = `:${key}`;
        updateExpression += `, ${attrNameKey} = ${valueKey}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expressionAttributeValues[valueKey] = value;
      }
    }

    // Handle password update separately if provided in the DTO
    if (updateUserDto.password) {
      if (updateUserDto.password.length < 8) {
        throw new BadRequestException(
          'Password must be at least 8 characters long.',
        );
      }
      const hashedPassword = await bcrypt.hash(
        updateUserDto.password,
        this.saltRounds,
      );
      updateExpression += ', passwordHash = :ph';
      expressionAttributeValues[':ph'] = hashedPassword;
    }

    // Prevent updating if no valid fields were provided (except updatedAt)
    if (
      Object.keys(expressionAttributeValues).length <= 1 &&
      !updateUserDto.password
    ) {
      const currentUser = await this.findOneByIdOrFail(userId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = currentUser;
      return result; // Return current state if nothing else changed
    }

    const commandInput: UpdateCommandInput = {
      TableName: this.tableName,
      Key: { userId: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(userId)',
      ReturnValues: 'ALL_NEW',
    };

    if (Object.keys(expressionAttributeNames).length > 0) {
      commandInput.ExpressionAttributeNames = expressionAttributeNames;
    }

    const command = new UpdateCommand(commandInput);

    try {
      const result = await this.dynamoDbClient.send(command);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...updatedUser } = result.Attributes as User;
      return updatedUser;
    } catch (error: unknown) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }
      console.error(`Error updating user ${userId}:`, error);
      throw new InternalServerErrorException('Could not update user.');
    }
  }

  // --- UPDATE USER'S OWN PROFILE ---
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<Omit<User, 'passwordHash'>> {
    const now = new Date().toISOString();
    let updateExpression = 'SET updatedAt = :ua';
    const expressionAttributeValues: Record<string, any> = { ':ua': now };

    for (const [key, value] of Object.entries(updateProfileDto)) {
      if (value !== undefined) {
        const valueKey = `:${key}`;
        updateExpression += `, ${key} = ${valueKey}`;
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        expressionAttributeValues[valueKey] = value;
      }
    }
    if (Object.keys(expressionAttributeValues).length <= 1) {
      const currentUser = await this.findOneByIdOrFail(userId);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...result } = currentUser;
      return result;
    }

    const commandInput: UpdateCommandInput = {
      TableName: this.tableName,
      Key: { userId: userId },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ConditionExpression: 'attribute_exists(userId)',
      ReturnValues: 'ALL_NEW',
    };

    const command = new UpdateCommand(commandInput);
    try {
      const result = await this.dynamoDbClient.send(command);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { passwordHash, ...updatedUser } = result.Attributes as User;
      return updatedUser;
    } catch (error: unknown) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }
      console.error(`Error updating user ${userId}:`, error);
      throw new InternalServerErrorException('Could not update user.');
    }
  }
  // --- DELETE ---
  async remove(userId: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: { userId: userId },
      ConditionExpression: 'attribute_exists(userId)',
    });

    try {
      await this.dynamoDbClient.send(command);
    } catch (error: unknown) {
      if (error instanceof ConditionalCheckFailedException) {
        throw new NotFoundException(`User with ID "${userId}" not found.`);
      }
      console.error(`Error deleting user ${userId}:`, error);
      throw new InternalServerErrorException('Could not delete user.');
    }
  }
}
