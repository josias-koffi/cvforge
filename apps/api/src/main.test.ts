import { beforeEach, describe, expect, it, vi } from "vitest";
const createMock = vi.fn();
const getMock = vi.fn();
const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

function createAppMock() {
  return {
    enableCors: vi.fn(),
    get: getMock,
    listen: vi.fn().mockResolvedValue(undefined),
    useBodyParser: vi.fn(),
  };
}

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
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(),
    });
    const app = createAppMock();
    createMock.mockResolvedValue(app);

    const { bootstrap } = await import("./main");

    const result = await bootstrap();

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      bodyParser: false,
      rawBody: true,
    });
    expect(app.useBodyParser).toHaveBeenCalledWith("json", { limit: "16mb" });
    expect(app.useBodyParser).toHaveBeenCalledWith("urlencoded", {
      extended: true,
      limit: "16mb",
    });
    expect(app.enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: "http://localhost:3000",
    });
    expect(getMock).toHaveBeenCalledTimes(1);
    expect(app.listen).toHaveBeenCalledWith(3333);
    expect(result).toBe(app);
  }, 10_000);

  it("should listen on the configured port when PORT is set", async () => {
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(),
    });
    const app = createAppMock();
    createMock.mockResolvedValue(app);
    process.env.PORT = "4010";
    process.env.NEXT_PUBLIC_APP_URL = "https://app.example.test";

    const { bootstrap } = await import("./main");

    await bootstrap();

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      bodyParser: false,
      rawBody: true,
    });
    expect(app.enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: "https://app.example.test",
    });
    expect(app.listen).toHaveBeenCalledWith("4010");
  });

  it("should auto-bootstrap on module load outside test mode", async () => {
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(),
    });
    const app = createAppMock();
    createMock.mockResolvedValue(app);
    process.env.NODE_ENV = "production";

    await import("./main");

    expect(createMock).toHaveBeenCalledWith(expect.anything(), {
      bodyParser: false,
      rawBody: true,
    });
    expect(app.enableCors).toHaveBeenCalledWith({
      credentials: true,
      origin: "http://localhost:3000",
    });
    expect(app.listen).toHaveBeenCalledWith(3333);
  });

  it("should warn clearly when auth email delivery is misconfigured", async () => {
    getMock.mockReturnValue({
      assertDeliveryReady: vi.fn(() => {
        throw new Error("Auth email delivery is misconfigured: EMAIL_FROM is missing.");
      }),
    });
    const app = createAppMock();
    createMock.mockResolvedValue(app);

    const { bootstrap } = await import("./main");

    await bootstrap();

    expect(warnSpy).toHaveBeenCalledWith(
      "[bootstrap] Auth email delivery is misconfigured: EMAIL_FROM is missing.",
    );
  });
});
