import { getApiDomain, getWsDomain } from "@/utils/domain";

const originalEnv = process.env;

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("getApiDomain", () => {
  it("returns localhost in development", () => {
    process.env.NODE_ENV = "development";
    expect(getApiDomain()).toBe("http://localhost:8080");
  });

  it("returns prod URL in production", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_PROD_API_URL = "https://my-prod-server.com";
    expect(getApiDomain()).toBe("https://my-prod-server.com");
  });
});

describe("getWsDomain", () => {
  it("returns ws://localhost in development", () => {
    process.env.NODE_ENV = "development";
    expect(getWsDomain()).toBe("ws://localhost:8080");
  });

  it("returns wss:// URL in production (https → wss)", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_PROD_API_URL = "https://my-prod-server.com";
    expect(getWsDomain()).toBe("wss://my-prod-server.com");
  });

  it("converts http to ws for http prod URLs", () => {
    process.env.NODE_ENV = "production";
    process.env.NEXT_PUBLIC_PROD_API_URL = "http://my-prod-server.com";
    expect(getWsDomain()).toBe("ws://my-prod-server.com");
  });
});
