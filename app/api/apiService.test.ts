import { ApiService } from "@/api/apiService";
import { ApplicationError } from "@/types/error";

jest.mock("@/utils/domain", () => ({
  getApiDomain: () => "http://localhost:8080",
}));

describe("ApiService", () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    localStorage.clear();
  });

  it("attaches the stored token to requests", async () => {
    localStorage.setItem("token", JSON.stringify("stored-token"));
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    } as Response);

    const api = new ApiService();
    await api.get("/households/10/pantry");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/households/10/pantry",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ Authorization: "stored-token" }),
      }),
    );
  });

  it("skips Authorization when token storage is malformed", async () => {
    localStorage.setItem("token", "not-json");
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    } as Response);

    const api = new ApiService();
    await api.get("/users");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/users",
      expect.objectContaining({
        headers: expect.not.objectContaining({ Authorization: expect.anything() }),
      }),
    );
  });

  it("serializes POST and PUT payloads", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({ ok: true }),
    } as Response);

    const api = new ApiService();
    await api.post("/households", { name: "Test House" });
    await api.put("/users/1", { bio: "hi" });

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8080/households",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Test House" }),
      }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8080/users/1",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ bio: "hi" }),
      }),
    );
  });

  it("returns the raw response for non-json content", async () => {
    const response = {
      ok: true,
      headers: { get: () => "text/plain" },
      text: async () => "ok",
    } as unknown as Response;
    fetchMock.mockResolvedValue(response);

    const api = new ApiService();
    const result = await api.delete<Response>("/households/10");

    expect(result).toBe(response);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/households/10",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("throws ApplicationError with backend details on failure", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      headers: { get: () => "application/json" },
      json: async () => ({ message: "No token" }),
    } as Response);

    const api = new ApiService();

    await expect(api.get("/households/10/pantry")).rejects.toMatchObject<ApplicationError>({
      status: 401,
      message: expect.stringContaining("No token"),
      info: expect.stringContaining('"status": 401'),
    });
  });
});
