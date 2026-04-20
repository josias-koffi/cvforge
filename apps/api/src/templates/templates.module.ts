import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { TemplatesController } from "./templates.controller";
import { resolveTemplatesConfig } from "./templates.config";
import { FileTemplatesStore } from "./templates.store";
import { TemplatesService } from "./templates.service";

@Module({
  imports: [AuthModule],
  controllers: [TemplatesController],
  providers: [
    {
      provide: TemplatesService,
      useFactory: () =>
        new TemplatesService(
          new FileTemplatesStore(
            resolveTemplatesConfig(process.env).stateFilePath,
          ),
        ),
    },
  ],
  exports: [TemplatesService],
})
export class TemplatesModule {}
