import { Injectable } from "@nestjs/common";
import type { FileProfilesStore } from "./profiles.store";
import type { StoredProfileRegistry } from "./profiles.types";

@Injectable()
export class ProfilesService {
  constructor(private readonly store: FileProfilesStore) {}

  getRegistry(userEmail: string): StoredProfileRegistry | null {
    return this.store.findByUserEmail(userEmail);
  }

  saveRegistry(
    userEmail: string,
    registry: StoredProfileRegistry,
  ): StoredProfileRegistry {
    return this.store.save(userEmail, registry);
  }
}
