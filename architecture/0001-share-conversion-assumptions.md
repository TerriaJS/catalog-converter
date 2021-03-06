# 1. Share conversion assumptions

Date: 2020-10-12

## Status

Mother issue - [Model architecture: Share & story migration ](https://github.com/terriajs/terriajs/issues/3654)

PR - https://github.com/TerriaJS/catalog-converter/pull/11

## Context

V7 share structure is quite different from v8 and there doesn't seem to be a clear way to convert properties (especially `id`s)

## Decision

### Manually set IDs

These are copied across in `convertMember`

### Autogenerated IDs

- v7 ID has format `Root Group/$someContainerId/$someLowerContainerId/$catalogName`
- v8 ID has format `//$someContainerId/$someLowerContainerId/$catalogName`
- So replace "Root Group" with "/"

**Note** these aren't written to the `id` catalog member property, they are used as keys in the model JSON

#### User added items (first level items)

- v7 ID has format `Root Group/User-Added Data/$catalogName`
- v8 ID has format `/$catalogName` (Not double slash)
- So remove `Root Group/User-Added Data`

##### Nested user added items

For example WMS groups - which aren't currently supported.

**All ids are deleted** so v8 will guess

### Known container IDs

Generated from `parents` property similar to IDs above, but:

- For user added data - use `__User-Added_Data__`
- For Root Group items - use `/`

### Unchanged Share properties

These are just copied across

- `initialCamera`
- `homeCamera`
- `baseMapName`
- `viewerMode`
- `currentTime`
- `showSplitter`
- `splitPosition`
- `previewedItemId`

### String init sources (eg URLs)

These are just copied across, so conversion must be handled client-side

### User added data

In v7 user added data is added to the `catalog` property. I am assuming that everything is contained (and correct) in the `Root Group/User-Added Data` catalog group (i.e. all user added data is in the `items` of the catalog group) - I ignore user added data models which are in `sharedCatalogMembers`.

Because otherwise - if a user-added item is shared in the workbench, it results in duplicate model across v7 `catalog` and `sharedCatalogMembers`.

For example

```json
{
  "version": "8.0.0",
  "initSources": [
    {
      "stratum": "user",
      "models": {
        "//Example Datasets": {
          "type": "group",
          "isOpen": true,
          "knownContainerUniqueIds": [
            "/"
          ]
        },
        "__User-Added_Data__": {
          "type": "group",
          "name": "User-Added Data",
          "members": [
            {
              "type": "csv",
              "name": "http://localhost:3001/data/2011Census_TOT_LGA.csv",
              "description": "",
              "info": [],
              "show": true,
              "splitDirection": 0,
              "url": "http://localhost:3001/data/2011Census_TOT_LGA.csv",
              "opacity": 0.8
            }
          ],
          "description": "The group for data that was added by the user via the Add Data panel.",
          "info": [],
          "isOpen": true,
          "knownContainerUniqueIds": [
            "/"
          ]
        },
        "/http://localhost:3001/data/2011Census_TOT_LGA.csv": {
          "type": "csv",
          "name": "http://localhost:3001/data/2011Census_TOT_LGA.csv",
          "show": true,
          "splitDirection": 0,
          "url": "http://localhost:3001/data/2011Census_TOT_LGA.csv",
          "opacity": 0.8,
          "knownContainerUniqueIds": [
            "__User-Added_Data__"
          ]
        }
      },
      "stories": [],
      "workbench": [
        "/http://localhost:3001/data/2011Census_TOT_LGA.csv"
      ],
```

## Consequences

May need tweaking as we add more catalog items, more share properties or when we add `shareKeys` to v8 (to keep track of IDs across different versions)
