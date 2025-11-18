/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { PreviewModal } from "@/components/organisms/preview-modal";

jest.mock("next/image", () => ({
  __esModule: true,
  default: ({ alt, src }: { alt?: string; src?: string }) =>
    React.createElement("img", {
      alt,
      src: typeof src === "string" ? src : undefined,
    }),
}));

const originalWarn = console.warn;
beforeAll(() => {
  jest.spyOn(console, "warn").mockImplementation((message?: unknown, ...rest) => {
    if (
      typeof message === "string" &&
      message.includes("Missing `Description`")
    ) {
      return;
    }
     
    originalWarn.apply(console, [message, ...rest]);
  });
});

afterAll(() => {
  (console.warn as jest.Mock).mockRestore();
});

describe("PreviewModal media selection", () => {
  const baseProps = {
    isOpen: true,
    onClose: () => undefined,
    accountGroup: {
      id: "group",
      name: "Group",
      accounts: {
        "instagram-account": {
          id: "instagram-account",
          platform: "instagram",
          name: "IG",
          username: "ig",
          apiUrl: "",
        },
        "reddit-account": {
          id: "reddit-account",
          platform: "reddit",
          name: "Reddit",
          username: "reddit",
          apiUrl: "",
        },
      },
    },
    selectedPlatforms: ["instagram-account", "reddit-account"],
    isReply: false,
    isQuote: false,
    isThread: false,
    threadPosts: [],
  } as const;

  const buildVariants = () => ({
    base: {
      media: [
        {
          type: "image",
          alt: "Base image",
          image: { url: "https://base.example/base.jpg" },
        },
      ],
      text: { toString: () => "Base text" },
    },
    instagram: {
      media: [
        {
          type: "image",
          image: { url: "https://cdn.example/ig1.jpg" },
          alt: "Instagram photo 1",
        },
        {
          type: "image",
          image: { url: "https://cdn.example/ig2.jpg" },
          alt: "Instagram photo 2",
        },
      ],
      text: { toString: () => "IG text" },
    },
  });

  it("uses variant-specific media for the active tab", () => {
    render(
      <PreviewModal
        {...baseProps}
        activeTab="instagram-account"
        content="IG caption"
        media={[]}
        variants={buildVariants()}
      />
    );

    const images = screen.getAllByRole("img");
    const alts = images.map((img) => img.getAttribute("alt"));
    expect(alts).toContain("Instagram photo 1");
    expect(alts).toContain("Instagram photo 2");
    expect(alts).not.toContain("Base image");
  });

});
