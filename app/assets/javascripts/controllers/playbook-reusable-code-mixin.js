ManageIQ.angular.app.service('playbookReusableCodeMixin', playbookReusableCodeMixin);
playbookReusableCodeMixin.$inject = ['API', '$q', 'miqService'];

function playbookReusableCodeMixin(API, $q, miqService) {
  var sortOptions = "&sort_by=name&sort_order=ascending";
  var allApiPromises = [];

  var getSortedHash = function(inputHash) {
    var sortedHash = Object.keys(inputHash)
      .map(function(key) {
        return ({"k": key, "v": inputHash[key]});
      })
      .sort(function(a, b) {
        return a.v.localeCompare(b.v);
      })
      .reduce(function(o, e) {
        o[e.k] = e.v;
        return o;
      }, {});
    return sortedHash;
  };

  var getVerbosityTypes = function() {
    return {
      "0": "0 (Normal)",
      "1": "1 (Verbose)",
      "2": "2 (More Verbose)",
      "3": "3 (Debug)",
      "4": "4 (Connection Debug)",
      "5": "5 (WinRM Debug)",
    };
  };

  var checkFormPristine = function(model, modelCopy, form) {
    if (angular.equals(model, modelCopy)) {
      form.$setPristine();
    } else {
      form.$setDirty();
    }
  };

  var getCloudCredentialsforType = function(prefix, typ, vm) {
    // list of cloud credentials based upon selected cloud type
    var url = '/api/authentications?collection_class=' + typ + '&expand=resources&attributes=id,name' + sortOptions;
    allApiPromises.push(API.get(url)
      .then(function(data) {
        vm[prefix + '_cloud_credentials'] = data.resources;
        findObjectForDropDown(prefix, '_cloud_credential', '_cloud_credentials', vm);
      })
      .catch(miqService.handleFailure)
    );
  };

  var findObjectForDropDown = function(prefix, fieldName, listName, vm) {
    vm['_' + prefix + fieldName] = _.find(vm[prefix + listName], {id: vm[vm.model][prefix + fieldName + '_id']});
  };

  var setIfDefined = function(value) {
    return (typeof value !== 'undefined') ? value : '';
  };

  var cloudCredentialsList = function(vm, provisionCredentialId, retirementCredentialId) {
    if (provisionCredentialId) {
      getCredentialType('provisioning', provisionCredentialId, vm);
    } else {
      vm._provisioning_cloud_type = '';
      vm._provisioning_cloud_credential_id = '';
    }
    if (vm[vm.model].retirement_cloud_credential_id !== undefined) {
      if (retirementCredentialId) {
        getCredentialType('retirement', retirementCredentialId, vm);
      } else {
        vm._retirement_cloud_type = '';
        vm._retirement_cloud_credential_id = '';
      }
    }
  };

  var getCredentialType = function(prefix, credentialId, vm) {
    var url = '/api/authentications/' + credentialId;
    allApiPromises.push(API.get(url)
      .then(function(data) {
        vm[prefix + '_cloud_type'] = data.type;
        if (vm.cloudTypes[vm[prefix + '_cloud_type']] !== 'undefined') {
          vm['_' + prefix + '_cloud_type'] = data.type;
          getCloudCredentialsforType(prefix, data.type, vm);
        }
      })
      .catch(miqService.handleFailure)
    );
  };

  // list of service catalogs
  var formOptions = function(vm) {
    miqService.sparkleOn();
    if (vm[vm.model].catalog_id !== undefined) {
      allApiPromises.push(API.get('/api/service_catalogs/?expand=resources&attributes=id,name' + sortOptions)
        .then(function(data) {
          vm.catalogs = data.resources;
          vm._catalog = _.find(vm.catalogs, {id: vm[vm.model].catalog_id});
        })
        .catch(miqService.handleFailure)
      );
    }

    // list of service dialogs
    if (vm[vm.model].provisioning_dialog_id !== undefined) {
      allApiPromises.push(API.get('/api/service_dialogs/?expand=resources&attributes=id,label&sort_by=label&sort_order=ascending')
        .then(function(data) {
          vm.dialogs = data.resources;
          vm._provisioning_dialog = _.find(vm.dialogs, {id: vm[vm.model].provisioning_dialog_id});
        })
        .catch(miqService.handleFailure)
      );
    }

    // list of repositories
    allApiPromises.push(API.get('/api/configuration_script_sources?collection_class=ManageIQ::Providers::EmbeddedAnsible::AutomationManager::ConfigurationScriptSource&expand=resources&attributes=id,name&filter[]=region_number=' + vm.currentRegion + sortOptions)
      .then(function(data) {
        vm.repositories = data.resources;
        vm._retirement_repository = _.find(vm.repositories, {id: vm[vm.model].retirement_repository_id});
        vm._provisioning_repository = _.find(vm.repositories, {id: vm[vm.model].provisioning_repository_id});
      })
      .catch(miqService.handleFailure)
    );

    // list of machine credentials
    allApiPromises.push(API.get('/api/authentications?collection_class=ManageIQ::Providers::EmbeddedAnsible::AutomationManager::MachineCredential&expand=resources&attributes=id,name' + sortOptions)
      .then(function(data) {
        vm.machine_credentials = data.resources;
        vm._retirement_machine_credential = _.find(vm.machine_credentials, {id: vm[vm.model].retirement_machine_credential_id});
        vm._provisioning_machine_credential = _.find(vm.machine_credentials, {id: vm[vm.model].provisioning_machine_credential_id});
      })
      .catch(miqService.handleFailure)
    );

    // list of network credentials
    allApiPromises.push(API.get('/api/authentications?collection_class=ManageIQ::Providers::EmbeddedAnsible::AutomationManager::NetworkCredential&expand=resources&attributes=id,name' + sortOptions)
      .then(function(data) {
        vm.network_credentials = data.resources;
        vm._retirement_network_credential = _.find(vm.network_credentials, {id: vm[vm.model].retirement_network_credential_id});
        vm._provisioning_network_credential = _.find(vm.network_credentials, {id: vm[vm.model].provisioning_network_credential_id});
      })
      .catch(miqService.handleFailure)
    );
  };

  function retrievedFormData(vm) {
    vm.afterGet = true;
    miqService.sparkleOff();
  }

  // list of cloud credentials
  var formCloudCredentials = function(vm, provisionCredentialId, retirementCredentialId) {
    allApiPromises.push(API.options('/api/authentications')
      .then(function(data) {
        var cloudTypes = {};
        angular.forEach(data.data.credential_types.embedded_ansible_credential_types, function(credObject, credType) {
          if (credObject.type === 'cloud') {
            cloudTypes[credType] = credObject.label;
          }
        });
        vm.cloudTypes = getSortedHash(cloudTypes);
        cloudCredentialsList(vm, provisionCredentialId, retirementCredentialId);
      })
      .catch(miqService.handleFailure)
    );
    $q.all(allApiPromises)
      .then(retrievedFormData(vm));
  };

  // get playbooks for selected repository
  var repositoryChanged = function(vm, prefix, id) {
    API.get('/api/configuration_script_sources/' + id + '/configuration_script_payloads?expand=resources&filter[]=region_number=' + vm.currentRegion + sortOptions)
      .then(function(data) {
        vm[prefix + '_playbooks'] = data.resources;
        // if repository has changed
        if (id !== vm[vm.model][prefix + '_repository_id']) {
          vm[vm.model][prefix + '_playbook_id'] = '';
          vm[vm.model][prefix + '_repository_id'] = id;
          if (vm[vm.model].retirement_remove_resources !== undefined) {
            getRemoveResourcesTypes(vm);
          }
        } else {
          findObjectForDropDown(prefix, '_playbook', '_playbooks', vm);
        }
      })
      .catch(miqService.handleFailure);
  };

  var getRemoveResourcesTypes = function(vm) {
    if (vm[vm.model].retirement_repository_id === undefined || vm[vm.model].retirement_repository_id === '') {
      vm[vm.model].retirement_remove_resources = 'yes_without_playbook';
      vm.remove_resources_types = {
        'No': 'no_without_playbook',
        'Yes': 'yes_without_playbook',
      };
    } else {
      vm[vm.model].retirement_remove_resources = 'no_with_playbook';
      vm.remove_resources_types = {
        'No': 'no_with_playbook',
        'Before Playbook runs': 'pre_with_playbook',
        'After Playbook runs': 'post_with_playbook',
      };
    }
  };

  var cloudTypeChanged = function(vm, prefix, value) {
    var valueChanged = (value !== vm.provisioning_cloud_type);
    if (value) {
      vm.provisioning_cloud_type = value;
    } else {
      vm.provisioning_cloud_type = '';
    }
    if (valueChanged) {
      var typ = vm.provisioning_cloud_type;
      vm[vm.model].provisioning_cloud_credential_id = '';
      getCloudCredentialsforType(prefix, typ, vm);
    }
  };

  return {
    checkFormPristine: checkFormPristine,
    cloudCredentialsList: cloudCredentialsList,
    cloudTypeChanged: cloudTypeChanged,
    getVerbosityTypes: getVerbosityTypes,
    getSortedHash: getSortedHash,
    getCloudCredentialsforType: getCloudCredentialsforType,
    getRemoveResourcesTypes: getRemoveResourcesTypes,
    findObjectForDropDown: findObjectForDropDown,
    formOptions: formOptions,
    formCloudCredentials: formCloudCredentials,
    repositoryChanged: repositoryChanged,
    setIfDefined: setIfDefined,
  };
}
