import "reflect-metadata";
import { describe, expect, it } from "vitest";
import { AppController } from "./app.controller";
import { AppModule } from "./app.module";
import { SmtpModule } from "./smtp/smtp.module";

describe("AppModule", () => {
  it("should register SmtpModule", () => {
    const imports = Reflect.getMetadata("imports", AppModule) as
      | unknown[]
      | undefined;

    expect(imports).toEqual([SmtpModule]);
  });

  it("should register AppController", () => {
    const controllers = Reflect.getMetadata("controllers", AppModule) as
      | unknown[]
      | undefined;

    expect(controllers).toEqual([AppController]);
  });
});
