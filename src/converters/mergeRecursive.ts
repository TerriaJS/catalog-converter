export default function mergeRecursive(catalogMembers: any[]) {
  // Recursively merge a list catalog members to a list of catalog members that is equivalent when loaded with TerriaJS
  const members: any[] = [];
  catalogMembers.forEach((m) => {
    if (m.name === undefined) {
      // Can't match. Push through to catalog converter to report error
      members.push(m);
      return;
    }
    // Find a matching member and merge properties, or add the member m
    // Assuming that a null id doesn't count as an id
    let matchIndex = -1;

    // This should match TerriaJS v7
    matchIndex = members.findIndex(
      (m2) =>
        m2.name === m.name &&
        !(m.id !== undefined && m2.id !== undefined && m.id !== m2.id)
    );
    // }

    const existingM = matchIndex >= 0 ? members[matchIndex] : {};
    // Merge m and existingM
    // For a catalog group, concat items and merge properties
    // For anything else just merge properties
    const updatedM = Object.assign({}, existingM, m);
    if (existingM.items != null || m.items != null) {
      updatedM.items = mergeRecursive(
        [].concat(existingM.items || [], m.items || [])
      );
    }
    if (matchIndex >= 0) {
      members[matchIndex] = updatedM;
    } else {
      members.push(updatedM);
    }
  });
  return members;
}
