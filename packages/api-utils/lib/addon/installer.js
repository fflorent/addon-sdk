/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const { Cc, Ci, Cu } = require("chrome");
const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");
const { defer } = require("api-utils/promise");

/**
 * `install` method error codes:
 *
 * https://developer.mozilla.org/en/Addons/Add-on_Manager/AddonManager#AddonInstall_errors
 */
exports.ERROR_NETWORK_FAILURE = AddonManager.ERROR_NETWORK_FAILURE;
exports.ERROR_INCORRECT_HASH = AddonManager.ERROR_INCORRECT_HASH;
exports.ERROR_CORRUPT_FILE = AddonManager.ERROR_CORRUPT_FILE;
exports.ERROR_FILE_ACCESS = AddonManager.ERROR_FILE_ACCESS;

/**
 * Immediatly install an addon.
 *
 * @param {String} xpiPath
 *   file path to an xpi file to install
 * @return {Promise}
 *   A promise resolved when the addon is finally installed.
 *   Resolved with addon id as value or rejected with an error code.
 */
exports.install = function install(xpiPath) {
  let { promise, resolve, reject } = defer();

  // Create nsIFile for the xpi file
  let file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsILocalFile);
  try {
    file.initWithPath(xpiPath);
  }
  catch(e) {
    reject(exports.ERROR_FILE_ACCESS);
    return promise;
  }

  // Listen for installation end
  let listener = {
    onInstallEnded: function(aInstall, aAddon) {
      aInstall.removeListener(listener);
      resolve(aAddon.id);
    },
    onInstallFailed: function (aInstall) {
      console.log("failed");
      aInstall.removeListener(listener);
      reject(aInstall.error);
    },
    onDownloadFailed: function(aInstall) {
      this.onInstallFailed(aInstall);
    }
  };

  // Order AddonManager to install the addon
  AddonManager.getInstallForFile(file, function(install) {
    install.addListener(listener);
    install.install();
  });

  return promise;
};

exports.uninstall = function uninstall(addonId) {
  let { promise, resolve, reject } = defer();

  // Listen for uninstallation end
  let listener = {
    onUninstalled: function onUninstalled(aAddon) {
      if (aAddon.id != addonId)
        return;
      AddonManager.removeAddonListener(listener);
      resolve();
    }
  };
  AddonManager.addAddonListener(listener);

  // Order Addonmanager to uninstall the addon
  AddonManager.getAddonByID(addonId, function (addon) {
    addon.uninstall();
  });

  return promise;
};

exports.disable = function disable(addonId) {
  let { promise, resolve, reject } = defer();

  AddonManager.getAddonByID(addonId, function (addon) {
    addon.userDisabled = true;
    resolve();
  });

  return promise;
};