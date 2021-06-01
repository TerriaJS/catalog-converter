export function transferIds(json: any, ids: any) {
  const replacements: { [key: string]: string } = {};

  const traverseMembers = (
    members: any[],
    replace = false,
    path: string = "root"
  ) => {
    members.forEach((member) => {
      const replaceId = replacements[`${path}/${member.name}`];
      if (replace && replaceId && replaceId !== member.id) {
        console.log(`Replaced ID ${member.id} with ${replaceId}`);
        member.id = replaceId;
      } else if (member.id && !replacements[`${path}/${member.name}`]) {
        replacements[`${path}/${member.name}`] = member.id;
      }
      const children = member.members ?? member.items;
      if (Array.isArray(children)) {
        traverseMembers(children, replace, `${path}/${member.name}`);
      }
    });
  };

  traverseMembers(ids);
  traverseMembers(json, true);
}
