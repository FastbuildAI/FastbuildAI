import { BaseModule } from "@common/base/base.module";
import { AuthGuard } from "@common/guards/auth.guard";
import { PermissionsGuard } from "@common/guards/permissions.guard";
// import { PluginGuard } from "@common/guards/plugin.guard";
import { CacheModule } from "@core/cache/cache.module";
import { DatabaseModule } from "@core/database/database.module";
// import { getPluginList, PluginsCoreModule } from "@core/plugins/plugins.module";
import { RedisModule } from "@core/redis/redis.module";
import { ChannelModule } from "@modules/console/channel/channel.module";
import { ConsoleModule } from "@modules/console/console.module";
import { WebModule } from "@modules/web/web.module";
import { DynamicModule, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ServeStaticModule } from "@nestjs/serve-static";
import { join } from "path";

@Module({})
export class AppModule {
    static async register(plugins?: DynamicModule[]): Promise<DynamicModule> {
        // const pluginsList = getPluginList();

        return {
            module: AppModule,
            imports: [
                ServeStaticModule.forRoot({
                    rootPath: join(__dirname, "..", "..", "..", "..", "public", "web"),
                    exclude: [
                        // ...pluginsList.map((plugin) => `/${plugin.name}`),
                        `${process.env.VITE_APP_WEB_API_PREFIX}`,
                        `${process.env.VITE_APP_CONSOLE_API_PREFIX}`,
                    ],
                }),
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: `../../.env.${process.env.NODE_ENV || "development"}.local`,
                }),
                DatabaseModule,
                RedisModule,
                CacheModule,
                WebModule,
                ConsoleModule,
                ChannelModule,
                BaseModule,
                // PluginsCoreModule.register(plugins),
            ],
            controllers: [],
            providers: [
                {
                    provide: APP_GUARD,
                    useClass: AuthGuard,
                },
                // {
                //     provide: APP_GUARD,
                //     useClass: PluginGuard,
                // },
                {
                    provide: APP_GUARD,
                    useClass: PermissionsGuard,
                },
            ],
        };
    }
}
