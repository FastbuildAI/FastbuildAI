import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";

import { Example } from "../../../entities/example.entity";
import { ExampleController } from "./example.controller";
import { ExampleService } from "./example.service";

/**
 * 示例模块
 */
@Module({
    imports: [TypeOrmModule.forFeature([Example])],
    controllers: [ExampleController],
    providers: [ExampleService],
    exports: [ExampleService],
})
export class ExampleModule {}
