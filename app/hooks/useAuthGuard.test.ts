import { renderHook } from "@testing-library/react";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

describe("useAuthGuard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
  });

  it("redirects to /login when no token is stored", () => {
    renderHook(() => useAuthGuard());
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when token is null", () => {
    sessionStorage.setItem("token", "null");
    renderHook(() => useAuthGuard());
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("redirects to /login when token is an empty string", () => {
    sessionStorage.setItem("token", JSON.stringify(""));
    renderHook(() => useAuthGuard());
    expect(replaceMock).toHaveBeenCalledWith("/login");
  });

  it("does not redirect when a valid token is stored", () => {
    sessionStorage.setItem("token", JSON.stringify("abc123"));
    renderHook(() => useAuthGuard());
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
