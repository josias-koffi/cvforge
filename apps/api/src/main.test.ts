import { beforeEach, describe, expect, it, vi } from "vitest";
const createMock = vi.fn();
const getMock = vi.fn();
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

vi.mock("@nestjs/core", () => ({
  NestFactory: {
    create: createMock,
  },
}));

describe("bootstrap", () => {
  beforeEach(() => {
    createMock.mockReset();
    getMock.mockReset();
    warnSpy.mockClear();
    vi.resetModules();
    process.env.NODE_ENV = "test";
    delete process.env.PORT;
    delete process.env.NEXT_PUBLIC_APP_URL;
  });

  it("should create the app and listen on the default port", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const enableCors = vi.fn();
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(),
    });
    const app = { enableCors, get: getMock, listen };
    createMock.mockResolvedValue(app);

    const { bootstrap } = await import("./main");

    const result = await bootstrap();

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      rawBody: true,
    });
    expect(enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: "http://localhost:3000",
    });
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith(3333);
    expect(result).toBe(app);
  });

  it("should listen on the configured port when PORT is set", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const enableCors = vi.fn();
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(),
    });
    const app = { enableCors, get: getMock, listen };
    createMock.mockResolvedValue(app);
    process.env.PORT = "4010";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";

    const { bootstrap } = await import("./main");

    await bootstrap();

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      rawBody: true,
    });
    expect(enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: "https://app.example.test",
    });
    expect(listen).toHaveBeenCalledWith("4010");
  });

  it("should auto-bootstrap on module load outside test mode", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const enableCors = vi.fn();
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(),
    });
    const app = { enableCors, get: getMock, listen };
    createMock.mockResolvedValue(app);
    process.env.NODE_ENV = "production";

    await import("./main");

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      rawBody: true,
    });
    expect(enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: "http://localhost:3000",
    });
    expect(listen).toHaveBeenCalledWith(3333);
  });

  it("should warn clearly when auth email delivery is misconfigured", async () => {
    const listen = vi.fn().mockResolvedValue(undefined);
    const enableCors = vi.fn();
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(() => {
        throw new Error("Auth email delivery is misconfigured: EMAIL_FROM is missing.");
      }),
    });
    const app = { enableCors, get: getMock, listen };
    createMock.mockResolvedValue(app);

    const { bootstrap } = await import("./main");

    await bootstrap();

    expect(warnSpy).toHaveBeenCalledWith(
      "[bootstrap] Auth email delivery is misconfigured: EMAIL_FROM is missing.",
    );
  });
});
