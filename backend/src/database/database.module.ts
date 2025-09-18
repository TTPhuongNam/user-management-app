import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DYNAMODB_CLIENT = 'DYNAMODB_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DYNAMODB_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const client = new DynamoDBClient({
          region: configService.get<string>('AWS_REGION'),
        });
        return DynamoDBDocumentClient.from(client);
      },
    },
  ],
  exports: [DYNAMODB_CLIENT],
})
export class DatabaseModule {}
