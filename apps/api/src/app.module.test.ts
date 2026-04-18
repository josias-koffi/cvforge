import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppModule } from "./app.module";

describe("AppModule", () => {
  it("should register AppController", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) as
      | unknown[]
      | undefined;

    expect(controllers).toEqual([AppController]);
  });
});
