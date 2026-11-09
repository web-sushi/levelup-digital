import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { portfolioReferenceFromQuery } from "@/lib/portfolio-reference";

describe("portfolio inquiry reference", () => {
  it("recognizes a published concept slug", () => {
    assert.deepEqual(portfolioReferenceFromQuery("tour-basic"), {
      slug: "tour-basic",
      title: "Tour Guide: Basic",
      path: "/work/tour-basic",
    });
  });

  it("recognizes a launched client slug", () => {
    assert.deepEqual(portfolioReferenceFromQuery("enjoy-travel-and-tours"), {
      slug: "enjoy-travel-and-tours",
      title: "Enjoy Travel & Tours",
      path: "/work/enjoy-travel-and-tours",
    });
  });

  it("ignores unknown, repeated, and unsafe query values", () => {
    assert.equal(portfolioReferenceFromQuery(undefined), null);
    assert.equal(portfolioReferenceFromQuery(""), null);
    assert.equal(portfolioReferenceFromQuery(["tour-basic"]), null);
    assert.equal(portfolioReferenceFromQuery("website"), null);
    assert.equal(portfolioReferenceFromQuery("tour-basic/../../admin"), null);
    assert.equal(portfolioReferenceFromQuery("https://evil.example"), null);
    assert.equal(portfolioReferenceFromQuery("tour-basic?next=/admin"), null);
    assert.equal(portfolioReferenceFromQuery("Tour-Basic"), null);
  });
});
