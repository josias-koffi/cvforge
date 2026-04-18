import { beforeEach, describe, expect, it, vi } from "vitest";

const createMock = vi.fn();

vi.mock("@nestjs/core", () => ({
  NestFactory: {
    create: createMock,
  },
}));

describe("bootstrap", () => {
  beforeEach(() => {
    createMock.mockReset();
    vi.resetModules();
    process.env.NODE_ENV = "test";
    delete process.env.PORT;
  });

  it("should create the app and listen on the default port", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const app = { listen };
    createMock.mockResolvedValue(app);

    const { bootstrap } = await import("./main");

    const result = await bootstrap();

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(3333);
    expect(result).toBe(app);
  });

  it("should listen on the configured port when PORT is set", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const app = { listen };
    createMock.mockResolvedValue(app);
    process.env.PORT = "4010";

    const { bootstrap } = await import("./main");

    await bootstrap();

    expect(listen).toHaveBeenCalledWith("4010");
  });

  it("should auto-bootstrap on module load outside test mode", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const app = { listen };
    createMock.mockResolvedValue(app);
    process.env.NODE_ENV = "production";

    await import("./main");

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(3333);
  });
});
