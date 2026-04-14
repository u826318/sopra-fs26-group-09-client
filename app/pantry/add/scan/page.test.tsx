/* eslint-disable @typescript-eslint/no-explicit-any, react/display-name */
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import PantryScanPage from "@/pantry/add/scan/page";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

jest.mock("antd", () => {
  const Button = ({ children, onClick, disabled, icon }: any) => (
    <button onClick={onClick} disabled={disabled}>
      {icon}
      {children}
    </button>
  );

  const Card = ({ children, title }: any) => (
    <div>
      {title ? <div>{title}</div> : null}
      <div>{children}</div>
    </div>
  );

  const Space = ({ children }: any) => <div>{children}</div>;
  const Divider = () => <hr />;
  const Alert = ({ message, description }: any) => (
    <div>
      <div>{message}</div>
      <div>{description}</div>
    </div>
  );

  const Image = ({ alt, src }: any) => <img alt={alt} src={src} />;

  const Upload = ({ children, beforeUpload }: any) => (
    <div>
      <button
        type="button"
        onClick={() =>
          beforeUpload(
            new File(["image-content"], "product.png", { type: "image/png" }),
          )
        }
      >
        Mock upload trigger
      </button>
      {children}
    </div>
  );

  const Typography = {
    Title: ({ children }: any) => <h1>{children}</h1>,
    Paragraph: ({ children }: any) => <p>{children}</p>,
    Text: ({ children }: any) => <span>{children}</span>,
  };

  return { Button, Card, Space, Divider, Alert, Image, Upload, Typography };
});

describe("PantryScanPage", () => {
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    jest.clearAllMocks();
    window.history.pushState({}, "", "/pantry/add/scan?householdId=7&householdName=Test%20Household");
    URL.createObjectURL = jest.fn(() => "blob:test-preview");
  });

  afterEach(() => {
    window.history.pushState({}, "", "/");
    URL.createObjectURL = originalCreateObjectURL;
  });

  it("renders scan page and pantry target", () => {
    render(<PantryScanPage />);

    expect(screen.getByText("Scan product image")).toBeInTheDocument();
    expect(screen.getByText("Test Household")).toBeInTheDocument();
    expect(screen.getByText("Choose an image")).toBeInTheDocument();
  });

  it("shows preview after selecting a file", () => {
    render(<PantryScanPage />);

    fireEvent.click(screen.getByRole("button", { name: "Mock upload trigger" }));

    expect(screen.getByAltText("Selected product image")).toBeInTheDocument();
    expect(screen.getByText("Image ready")).toBeInTheDocument();
  });

  it("navigates back to pantry", () => {
    render(<PantryScanPage />);

    fireEvent.click(screen.getByRole("button", { name: /Back to pantry/i }));

    expect(pushMock).toHaveBeenCalledWith(
      "/households/7?name=Test%20Household",
    );
  });

  it("navigates to manual barcode entry", () => {
    render(<PantryScanPage />);

    fireEvent.click(screen.getByRole("button", { name: /Enter barcode manually/i }));

    expect(pushMock).toHaveBeenCalledWith(
      "/open-food-facts?householdId=7&householdName=Test%20Household",
    );
  });
});