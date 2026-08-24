import { describe, expect, it } from "vitest";
import { auth } from "./index";

describe("auth module factory", () => {
  it("keeps public registration as the zero-argument CLI default", () => {
    expect(auth.length).toBe(0);
    expect(auth().clientConfig).toEqual({ registration: "public" });
    expect(auth({ registration: "closed" }).clientConfig).toEqual({ registration: "closed" });
  });
});
