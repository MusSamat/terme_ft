import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LikeButton } from "@/components/ui/like-button";
import { useAuth } from "@/store/auth";
import { useRouter } from "next/navigation";
import * as tripsApi from "@/lib/api/trips";
import * as requestsApi from "@/lib/api/passenger-requests";

vi.mock("next-intl", () => ({ useTranslations: () => (k: string) => k }));
vi.mock("next/navigation", () => ({ useRouter: vi.fn() }));
vi.mock("@/store/auth", () => ({ useAuth: vi.fn() }));
vi.mock("@/lib/api/trips", () => ({
  likeTrip: vi.fn().mockResolvedValue({ liked: true }),
  unlikeTrip: vi.fn().mockResolvedValue({ liked: false }),
}));
vi.mock("@/lib/api/passenger-requests", () => ({
  likePassengerRequest: vi.fn().mockResolvedValue({ liked: true }),
  unlikePassengerRequest: vi.fn().mockResolvedValue({ liked: false }),
}));

const mockPush = vi.fn();

function mockAuth(status: "authenticated" | "anonymous" | "idle" | "loading") {
  vi.mocked(useAuth).mockImplementation((selector: any) => selector({ status }));
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
  mockAuth("authenticated");
});

describe("LikeButton", () => {
  it("renders pressed state from liked=true", () => {
    render(<LikeButton targetType="trip" id="t1" liked />, { wrapper });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
  });

  it("renders unpressed state from liked=false", () => {
    render(<LikeButton targetType="trip" id="t1" liked={false} />, { wrapper });
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders filled icon when liked", () => {
    const { container } = render(<LikeButton targetType="trip" id="t1" liked />, { wrapper });
    expect(container.querySelector("svg")).toHaveClass("fill-brand-600");
  });

  it("renders outline icon when not liked", () => {
    const { container } = render(<LikeButton targetType="trip" id="t1" liked={false} />, { wrapper });
    expect(container.querySelector("svg")).not.toHaveClass("fill-brand-600");
  });

  it("toggles aria-pressed and calls likeTrip on click when not liked", async () => {
    render(<LikeButton targetType="trip" id="t1" liked={false} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "true");
    await waitFor(() => expect(vi.mocked(tripsApi.likeTrip)).toHaveBeenCalledWith("t1"));
  });

  it("calls unlikeTrip on click when already liked", async () => {
    render(<LikeButton targetType="trip" id="t1" liked />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button")).toHaveAttribute("aria-pressed", "false");
    await waitFor(() => expect(vi.mocked(tripsApi.unlikeTrip)).toHaveBeenCalledWith("t1"));
  });

  it("calls likePassengerRequest for passenger_request target", async () => {
    render(<LikeButton targetType="passenger_request" id="r1" liked={false} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    await waitFor(() => expect(vi.mocked(requestsApi.likePassengerRequest)).toHaveBeenCalledWith("r1"));
  });

  it("redirects anonymous users to login and does not mutate", () => {
    mockAuth("anonymous");
    render(<LikeButton targetType="trip" id="t1" liked={false} />, { wrapper });
    fireEvent.click(screen.getByRole("button"));
    expect(mockPush).toHaveBeenCalledWith("/auth/login");
    expect(vi.mocked(tripsApi.likeTrip)).not.toHaveBeenCalled();
  });
});
