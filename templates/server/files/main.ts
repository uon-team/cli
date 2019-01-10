
import { Module, Application } from '@uon/core';
import { HttpModule, HTTP_ROUTER } from '@uon/server';
import { RouterModule } from '@uon/router';
import { ROUTES } from './src/routes';

@Module({
    imports: [
        HttpModule.WithConfig({
            plainPort: 8080
        }),
        RouterModule.For(HTTP_ROUTER, ROUTES)
    ]
})
export class ServerEntrypointModule { }


Application.Bootstrap(ServerEntrypointModule).start();