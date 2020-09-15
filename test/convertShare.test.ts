import { convertShare } from "../src/convert";
import { Severity } from "../src/Message";

describe("Test convertShare", () => {
  it("Basic share link", () => {
    const file = "share";
    const [v7, v8] = ["v7", "v8"].map((folder) =>
      require(`./samples/${folder}/${file}.json`)
    );
    const res = convertShare(v7);
    expect(res.converted).toBeTruthy();
    expect(res.result).toMatchObject(v8);
    expect(
      res.messages.filter(({ severity }) => severity === Severity.Error)
    ).toHaveLength(0);
  });
});
