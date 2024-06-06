<!--
  Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements.  See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License.  You may obtain a copy of the License at

      https://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<script lang="ts">
  export default {
    name: 'EditFlink',
  };
</script>
<script setup lang="ts" name="EditFlink">
  import { PageWrapper } from '/@/components/Page';
  import { BasicForm, useForm } from '/@/components/Form';
  import { onMounted, onBeforeUnmount, reactive, ref, nextTick, unref } from 'vue';
  import { Alert } from 'ant-design-vue';
  import { fetchMain, fetchUpload, fetchUpdate } from '/@/api/flink/app/app';
  import { handleSubmitParams } from './utils';
  import PomTemplateTab from './components/PodTemplate/PomTemplateTab.vue';
  import { fetchListJars } from '/@/api/flink/project';
  import { useEditFlinkSchema } from './hooks/useEditFlinkSchema';
  import { useEdit } from './hooks/useEdit';
  import { useMessage } from '/@/hooks/web/useMessage';
  import { useI18n } from '/@/hooks/web/useI18n';
  import { useRoute } from 'vue-router';
  import { useGo } from '/@/hooks/web/usePage';
  import UploadJobJar from './components/UploadJobJar.vue';
  import ProgramArgs from './components/ProgramArgs.vue';
  import VariableReview from './components/VariableReview.vue';
  import { useDrawer } from '/@/components/Drawer';
  import { ExecModeEnum, ResourceFromEnum } from '/@/enums/flinkEnum';
  import Dependency from '/@/views/flink/app/components/Dependency.vue';
  import SidebarMenu from './components/SidebarMenu.vue'
  import AddAttrDrawer from './components/AddAttrDrawer.vue'
  import AddConfigDrawer from './components/AddConfigDrawer.vue'

  const route = useRoute();
  const { t } = useI18n();
  const { createMessage } = useMessage();
  const go = useGo();

  const submitLoading = ref<boolean>(false);
  const jars = ref<string[]>([]);

  const uploadLoading = ref(false);
  const uploadJar = ref('');
  const programArgRef = ref();
  const podTemplateRef = ref();
  const dependencyRef = ref();
  let initFormModel = reactive<Recordable>({})
  let isfailMsgActive = ref(false)
  let isAttrfailMsgActive = ref(false)
  const k8sTemplate = reactive({
    podTemplate: '',
    jmPodTemplate: '',
    tmPodTemplate: '',
  });

  const configForm = ref<InstanceType<typeof AddConfigDrawer> | null>(null);
  const attributeForm = ref<InstanceType<typeof AddAttrDrawer> | null>(null);
  const attrVisible = ref(false)
  const configVisible = ref(false)

  const [registerReviewDrawer, { openDrawer: openReviewDrawer }] = useDrawer();
  const [registerDrawer, { openDrawer, closeDrawer }] = useDrawer();
  const [registerConfigureDrawer, { openDrawer: openConfigureDrawer, closeDrawer: closeConfigureDrawer }] = useDrawer();

  const { getEditMainFlinkFormSchema, getEditAttrFlinkFormSchema, getEditConfigFlinkFormSchema, flinkEnvs, alerts, suggestions } = useEditFlinkSchema(jars);
  const { handleGetApplication, app, handleResetApplication } = useEdit();
  const [registerForm, { setFieldsValue, submit }] = useForm({
    labelWidth: 120,
    colon: true,
    baseColProps: { span: 24 },
    labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
    wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
    showActionButtonGroup: false,
  });

  /* Form reset */
  function handleReset(executionMode?: string) {
    nextTick(async () => {
      let selectAlertId: string | undefined;
      if (app.alertId) {
        selectAlertId = unref(alerts)?.filter((t) => t.id == app.alertId)[0]?.id;
      }
      const resetParams = handleResetApplication();
      const defaultParams = {
        jobName: app.jobName,
        tags: app.tags,
        mainClass: app.mainClass,
        args: app.args || '',
        jar: app.jar,
        description: app.description,
        dynamicProperties: app.dynamicProperties,
        resolveOrder: app.resolveOrder,
        executionMode: app.executionMode,
        yarnQueue: app.yarnQueue,
        restartSize: app.restartSize,
        checkPointFailure: {
          cpMaxFailureInterval: app.cpMaxFailureInterval,
          cpFailureRateInterval: app.cpFailureRateInterval,
          cpFailureAction: app.cpFailureAction,
        },
        versionId: app.versionId || null,
        k8sRestExposedType: app.k8sRestExposedType,
        flinkImage: app.flinkImage,
        k8sNamespace: app.k8sNamespace || null,
        serviceAccount: app.serviceAccount || null,
        alertId: selectAlertId,
        projectName: app.projectName,
        module: app.module,
        k8sTemplate: {
          podTemplate: app.k8sPodTemplate || '',
          jmPodTemplate: app.k8sJmPodTemplate || '',
          tmPodTemplate: app.k8sTmPodTemplate || '',
        },
        ...resetParams,
      };

      switch (app.executionMode) {
        case ExecModeEnum.STANDALONE:
          defaultParams['remoteClusterId'] = app.flinkClusterId;
          break;
        case ExecModeEnum.YARN_SESSION:
          defaultParams['yarnSessionClusterId'] = app.flinkClusterId;
          break;
        case ExecModeEnum.KUBERNETES_SESSION:
          defaultParams['k8sSessionClusterId'] = app.flinkClusterId;
          break;
        default:
          break;
      }

      if (!executionMode) {
        Object.assign(defaultParams, { executionMode: app.executionMode });
      }
      setFieldsValue(defaultParams);
      console.log("initFormModel", initFormModel)
      console.log("defaultParams", defaultParams)
      initFormModel = {...initFormModel, ...defaultParams}
      sessionStorage.setItem('AddJobModalParams', JSON.stringify(initFormModel))
      app.args && programArgRef.value?.setContent(app.args);
      // setTimeout(() => {
      //   unref(dependencyRef)?.setDefaultValue(JSON.parse(app.dependency || '{}'));
      //   unref(podTemplateRef)?.handleChoicePodTemplate('ptVisual', app.k8sPodTemplate);
      //   unref(podTemplateRef)?.handleChoicePodTemplate('jmPtVisual', app.k8sJmPodTemplate);
      //   unref(podTemplateRef)?.handleChoicePodTemplate('tmPtVisual', app.k8sTmPodTemplate);
      // }, 1000);
    });
  }
  /* Custom job upload */
  async function handleCustomJobRequest(data) {
    const formData = new FormData();
    formData.append('file', data.file);
    try {
      const path = await fetchUpload(formData);
      uploadJar.value = data.file.name;
      const res = await fetchMain({
        jar: path,
      });
      uploadLoading.value = false;
      setFieldsValue({ mainClass: res, jar: unref(uploadJar) });
    } catch (error) {
      console.error(error);
      uploadLoading.value = false;
    }
  }

  /* Handling update parameters */
  async function handleAppUpdate(values: Recordable) {
    // Trigger a pom confirmation operation.
    const drawerValues = sessionStorage.getItem('AddJobModalParams') || '{}';
    values = { ...JSON.parse(drawerValues), ...values}
    console.log("updatae", values)
    k8sTemplate.podTemplate = values.k8sTemplate?.podTemplate ?? ''
    k8sTemplate.jmPodTemplate = values.k8sTemplate?.jmPodTemplate ?? ''
    k8sTemplate.tmPodTemplate = values.k8sTemplate?.tmPodTemplate ?? ''
    submitLoading.value = true;
    try {
      const params = {
        id: app.id,
        jar: values.jar,
        mainClass: values.mainClass,
        dependency: values.dependency
      };
      console.log("updateValues", values)
      handleSubmitParams(params, values, k8sTemplate);
      await handleUpdateApp(params);
    } catch (error) {
      submitLoading.value = false;
    }
  }

  /* Submit an update */
  async function handleUpdateApp(params: Recordable) {
    console.log("updateparams", params)
    const updated = await fetchUpdate(params);
    if (updated) {
      createMessage.success(t('flink.app.editStreamPark.success'));
      go('/flink/app');
    }
  }

  async function handleEdit(type: string) {
    if(attrVisible.value) {
      await attributeForm.value?.handleSubmit()
    }
    if(configVisible.value) {
      await configForm.value?.handleSubmit()
    }
    const initFormData = JSON.parse(sessionStorage.getItem('AddJobModalParams')!)
    if (type === 'attr') {
      configVisible.value = false
      attrVisible.value = true
      closeConfigureDrawer();
      openDrawer(true, initFormData);
    } else {
      attrVisible.value = false
      configVisible.value = true
      closeDrawer()
      openConfigureDrawer(true, initFormData);
    }
  }
  async function addConfigFailed(type: string) {
    if (type === 'config') {
      isfailMsgActive.value = true
    } else {
      isAttrfailMsgActive.value = true
    }
    configVisible.value = false
    attrVisible.value = false
  }
  async function addConfigsuccess() {
    configVisible.value = false
    attrVisible.value = false
  }

  onMounted(async () => {
    if (!route?.query?.appId) {
      go('/flink/app');
      createMessage.warning(t('flink.app.editStreamPark.appidCheck'));
      return;
    }
    const value = await handleGetApplication();
    initFormModel = {...value, options: app.options || {}, id: route.query.appId}
    // nextTick(async ()=>{
    await setFieldsValue(value);
    try {
      if (app.resourceFrom == ResourceFromEnum.CICD) {
        jars.value = await fetchListJars({
          id: app.projectId,
          module: app.module,
        });
      }
    } catch(e) {}
    handleReset();
    // })
  });
  onBeforeUnmount(() => {
    sessionStorage.removeItem('AddJobModalParams');
  })
</script>
<template>
  <div>
  <PageWrapper contentBackground content-class="p-26px app_controller app-content-margin-right">
    <BasicForm 
      @register="registerForm" 
      @submit="handleAppUpdate" 
      :schemas="getEditMainFlinkFormSchema"
      :isAboutApp="true"
    >
      <template #podTemplate>
        <PomTemplateTab
          ref="podTemplateRef"
          v-model:podTemplate="k8sTemplate.podTemplate"
          v-model:jmPodTemplate="k8sTemplate.jmPodTemplate"
          v-model:tmPodTemplate="k8sTemplate.tmPodTemplate"
        />
      </template>

      <template #uploadJobJar>
        <UploadJobJar :custom-request="handleCustomJobRequest" v-model:loading="uploadLoading">
          <template #uploadInfo>
            <Alert v-if="uploadJar" class="uploadjar-box" type="info">
              <template #message>
                <span class="tag-dependency-pom">
                  {{ uploadJar }}
                </span>
              </template>
            </Alert>
          </template>
        </UploadJobJar>
      </template>

      <template #args="{ model }">
        <ProgramArgs
          ref="programArgRef"
          v-if="model.args != null"
          v-model:value="model.args"
          :suggestions="suggestions"
          @preview="(value) => openReviewDrawer(true, { value, suggestions })"
        />
      </template>

      <template #dependency="{ model, field }">
        <Dependency ref="dependencyRef" v-model:value="model[field]" :form-model="model" />
      </template>

      <template #formFooter>
        <div class="flex items-center w-full justify-end">
          <a-button @click="go('/flink/app')">
            {{ t('common.cancelText') }}
          </a-button>
          <a-button class="ml-4" :loading="submitLoading" type="primary" @click="submit()">
            {{ t('common.submitText') }}
          </a-button>
        </div>
      </template>
    </BasicForm>
    <VariableReview @register="registerReviewDrawer" />
    <SidebarMenu
      :isAttrfailMsgActive="isAttrfailMsgActive"
      :isfailMsgActive="isfailMsgActive"
      :attrVisible="attrVisible" 
      :configVisible="configVisible" 
      @openDrawer="handleEdit"
    />
  </PageWrapper>
  <AddAttrDrawer
    ref="attributeForm"
    :schema="getEditAttrFlinkFormSchema"
    :flinkEnvs="flinkEnvs"
    @register="registerDrawer"
    @addAttrFailed="addConfigFailed"
    @addAttrsuccess="addConfigsuccess"
  />
  <AddConfigDrawer
    ref="configForm" 
    :schema="getEditConfigFlinkFormSchema" 
    @register="registerConfigureDrawer" 
    @addConfigFailed="addConfigFailed"
    @addAttrsuccess="addConfigsuccess"

  />
</div>
</template>
<style lang="less">
  @import url('./styles/Add.less');
</style>
