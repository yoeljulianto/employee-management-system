import { describe, expect, it } from "vitest";
import { toCsv } from "../src/utils/csv";

describe("toCsv", () => {
  it("membuat header dan baris data", () => {
    expect(toCsv(["A", "B"], [[1, "x"]])).toBe("A,B\r\n1,x");
  });

  it("membungkus nilai yang berisi koma atau tanda kutip", () => {
    expect(toCsv(["A"], [["a,b"], ['say "hi"']])).toBe('A\r\n"a,b"\r\n"say ""hi"""');
  });

  it("mencegah CSV injection", () => {
    expect(toCsv(["A"], [["@cmd"], ["+62812"]])).toBe("A\r\n'@cmd\r\n'+62812");
  });

  it("mengosongkan nilai null dan undefined", () => {
    expect(toCsv(["A", "B"], [[null, undefined]])).toBe("A,B\r\n,");
  });
});