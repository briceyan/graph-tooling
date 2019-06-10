const fs = require('fs-extra')
const semver = require('semver')
const toolbox = require('gluegun/toolbox')
const yaml = require('js-yaml')
const { getGraphTsVersion } = require('./util/versions')

// If any of the manifest apiVersions are 0.0.1, replace them with 0.0.2
module.exports = {
  name: 'Bump mapping apiVersion from 0.0.1 to 0.0.2',
  predicate: async ({ sourceDir, manifestFile }) => {
    // Obtain the graph-ts version, if possible
    let graphTsVersion
    try {
      graphTsVersion = getGraphTsVersion(sourceDir)
    } catch (_) {
      // If we cannot obtain the version, return a hint that the graph-ts
      // hasn't been installed yet
      return 'graph-ts dependency not installed yet'
    }

    let manifest = yaml.safeLoad(fs.readFileSync(manifestFile, 'utf-8'))
    return (
      // Only migrate if the graph-ts version is > 0.5.1...
      semver.gt(graphTsVersion, '0.5.1') &&
      // ...and we have a manifest with mapping > apiVersion = 0.0.1
      manifest &&
      typeof manifest === 'object' &&
      Array.isArray(manifest.dataSources) &&
      manifest.dataSources.reduce(
        (hasOldMappings, dataSource) =>
          hasOldMappings ||
          (typeof dataSource === 'object' &&
            dataSource.mapping &&
            typeof dataSource.mapping === 'object' &&
            dataSource.mapping.apiVersion === '0.0.1'),
        false,
      )
    )
  },
  apply: async ({ manifestFile }) => {
    // Make sure we catch all variants; we could load the manifest
    // and replace the values in the data structures here; unfortunately
    // writing that back to the file messes with the formatting more than
    // we'd like; that's why for now, we use a simple patching approach
    await toolbox.patching.replace(manifestFile, 'apiVersion: 0.0.1', 'apiVersion: 0.0.2')
    await toolbox.patching.replace(
      manifestFile,
      "apiVersion: '0.0.1'",
      "apiVersion: '0.0.2'",
    )
    await toolbox.patching.replace(
      manifestFile,
      'apiVersion: "0.0.1"',
      'apiVersion: "0.0.2"',
    )
  },
}
