import { Injectable } from "@nestjs/common";
import type { ProfilesStore, StoredProfileRegistry } from "./profiles.types";

@Injectable()
export class ProfilesService {
  constructor(private readonly store: ProfilesStore) {}

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
