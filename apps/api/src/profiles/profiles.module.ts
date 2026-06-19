import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { resolveProfilesConfig } from "./profiles.config";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";
import { FileProfilesStore } from "./profiles.store";

export const PROFILES_STORE = Symbol("PROFILES_STORE");

@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [
    {
      provide: PROFILES_STORE,
      useFactory: () =>
        new FileProfilesStore(resolveProfilesConfig(process.env).stateFilePath),
    },
    {
      provide: ProfilesService,
      inject: [PROFILES_STORE],
      useFactory: (store: FileProfilesStore) => new ProfilesService(store),
    },
  ],
  exports: [PROFILES_STORE],
})
export class ProfilesModule {}
