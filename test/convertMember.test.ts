import {
  convertCatalog,
  convertMember,
  Severity,
} from "../src/catalog-converter";
// Short tests
describe("Test that convertMember", () => {
  it("turns empty items into empty members", () => {
    const res = convertMember({
      type: "group",
      name: "Test group",
      items: [],
    });
    expect(res.member).toMatchObject({
      type: "group",
      name: "Test group",
      members: [],
    });
    expect(res.messages).toHaveLength(0);
  });

  it("returns an error when a catalog member is missing a name or type", () => {
    const res1 = convertMember({
      type: "group",
    });
    const res2 = convertMember({
      name: "Test no type",
    });
    [res1, res2].forEach((res) => {
      expect(res.member).toBeNull();
      expect(res.messages).toHaveLength(1);
      expect(res.messages).toMatchObject([
        {
          message: "Member doesn't have type and name",
          path: ["?"],
          severity: Severity.Error,
        },
      ]);
    });
  });

  it("returns an error when the type is not recognised", () => {
    const type = "FAKE";
    const name = "Test unrecognised type";
    const res = convertMember({
      type,
      name,
    });
    expect(res.member).toBeNull();
    expect(res.messages).toMatchObject([
      {
        message: `Unknown or unsupported type "${type}"`,
        path: [name],
        severity: Severity.Error,
      },
    ]);
    expect(res.messages).toHaveLength(1);
  });

  it("other members inside a group with an invalid member are still converted", () => {
    const type = "FAKE";
    const name = "Test unrecognised type";
    const groupName = "Test error in group";
    const res = convertMember({
      type: "group",
      name: groupName,
      items: [
        { type, name },
        { type: "group", name: "Other good group", items: [] },
      ],
    });
    expect(res.member).toMatchObject({
      type: "group",
      name: groupName,
      members: [{ type: "group", name: "Other good group", members: [] }],
    });
    expect(res.messages).toMatchObject([
      {
        message: `Unknown or unsupported type "${type}"`,
        path: [groupName, name],
        severity: Severity.Error,
      },
    ]);
  });
});
