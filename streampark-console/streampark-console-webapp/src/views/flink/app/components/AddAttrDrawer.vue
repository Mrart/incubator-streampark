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
export default defineComponent({
  name: 'AddAttrDrawer',
});
</script>
<script setup lang="ts" name="AddAttrDrawer">
import { computed, nextTick, defineComponent, ref, unref, reactive, defineExpose } from 'vue';
import { BasicForm, FormSchema, useForm } from '/@/components/Form';
// import { formSchema } from '../user.data';
import { FormTypeEnum } from '/@/enums/formEnum';
import { ExecModeEnum } from '/@/enums/flinkEnum';
import { BasicDrawer, useDrawerInner } from '/@/components/Drawer';
import { fetchCheckName } from '/@/api/flink/app/app';
// import { useCreateSchema } from '../hooks/useCreateSchema';
// import { addUser, updateUser } from '/@/api/system/user';
import Icon from '/@/components/Icon';
import { useI18n } from '/@/hooks/web/useI18n';
import { AppListRecord } from '/@/api/flink/app/app.type';
import PomTemplateTab from './PodTemplate/PomTemplateTab.vue';
import { useMessage } from '/@/hooks/web/useMessage';
import { createAsyncComponent } from '/@/utils/factory/createAsyncComponent';
import UseSysHadoopConf from './UseSysHadoopConf.vue';
import { FlinkEnv } from '/@/api/flink/setting/types/flinkEnv.type';
const Dependency = createAsyncComponent(() => import('./Dependency.vue'), {
  loading: true,
});
const emit = defineEmits(['addAttrsuccess', 'register', 'addAttrFailed']);
const props = defineProps({
  schema: {
    type: Array as PropType<FormSchema[]>
  },
  flinkEnvs: {
    type: Array as PropType<FlinkEnv[]>
  }
})
const { t } = useI18n();
const formType = ref(FormTypeEnum.Edit);
const dependencyRef = ref();
const app = reactive<Partial<AppListRecord>>({}); // 属性提交的参数
const { createMessage } = useMessage();
let isSubmitConfig = ref(false)
const k8sTemplate = reactive({
  podTemplate: '',
  jmPodTemplate: '',
  tmPodTemplate: '',
});
const podTemplateRef = ref();
const defaultCheckPointFailure = {
  cpMaxFailureInterval: null,
  cpFailureRateInterval: null,
  cpFailureAction: null 
}
// const { getAttrCreateFormSchema, flinkEnvs } = useCreateSchema(dependencyRef, true);
const [registerForm, { resetFields, setFieldsValue, clearValidate, validate }] = useForm({
  labelCol: { lg: { span: 5, offset: 0 }, sm: { span: 7, offset: 0 } },
  wrapperCol: { lg: { span: 16, offset: 0 }, sm: { span: 17, offset: 0 } },
  baseColProps: { span: 24 },
  colon: true,
  showActionButtonGroup: false
});
const initFormModel = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}')
initFormModel.useSysHadoopConf = false
initFormModel.checkPointFailure = initFormModel.checkPointFailure ? initFormModel.checkPointFailure : defaultCheckPointFailure
const [registerDrawer, { setDrawerProps, closeDrawer }] = useDrawerInner(async (data) => {
  // formType.value = data.formType;
  resetFields();
  clearValidate();
  // updateSchema(formSchema(unref(formType)));
  setDrawerProps({
    confirmLoading: false
  });
  Object.assign(app, data);
  console.log("attrDrawer", data)
  const parmas = {...data, checkPointFailur: data.checkPointFailure ? data.checkPointFailure : defaultCheckPointFailure}// init checkPoint失败策略 防止组件异步加载告警
  setFieldsValue({...parmas, dependency: ''});
  nextTick(() => {
    setTimeout(() => {
      unref(dependencyRef)?.setDefaultValue(JSON.parse(data.dependency || '{}'));
      if (data.id) {
        unref(podTemplateRef)?.handleChoicePodTemplate('ptVisual', data.k8sTemplate.podTemplate || '');
        unref(podTemplateRef)?.handleChoicePodTemplate('jmPtVisual', data.k8sTemplate.jmPodTemplate || '');
        unref(podTemplateRef)?.handleChoicePodTemplate('tmPtVisual', data.k8sTemplate.tmPodTemplate || '');
      }
    }, 1000);
  });
  // if (unref(formType) !== FormTypeEnum.Create) {
  //   const roleIds = data.record?.roleId ?? [];
  //   data.record.roleId = Array.isArray(roleIds) ? roleIds : roleIds.split(',');
  //   setFieldsValue(data);
  // }
});

const getTitle = computed(() => {
  return {
    // [FormTypeEnum.Create]: t('system.user.form.create'),
    [FormTypeEnum.Edit]: t('flink.app.addDrawerMenu.editAttr'),
    // [FormTypeEnum.View]: t('system.user.form.view'),
  }[unref(formType)];
});

async function handleSubmit() {
  try {
    const values = await validate();
    setDrawerProps({ confirmLoading: true });
    const oldValues = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}');
    const dependency = await getDependency()
    const params = { ...oldValues, ...values, dependency, k8sTemplate}
    sessionStorage.setItem('AddJobModalParams', JSON.stringify(params));
    setFieldsValue({jobName: values.jobName})
    isSubmitConfig.value = true
    closeDrawer();
    emit('addAttrsuccess', 'attr');
  } catch (e) {
    createMessage.warning(t('flink.app.addDrawerMenu.attributeValidateTips'))
    isSubmitConfig.value = false
    emit('addAttrFailed', 'attr');
  } finally {
    setDrawerProps({ confirmLoading: false });
  }
}

// async function handleClose() {
//   const values = getFieldsValue()
//   const oldValues = JSON.parse(sessionStorage.getItem('AddJobModalParams') || '{}');
//   const dependency = await getDependency()
//   const params = { ...oldValues, ...values, dependency, k8sTemplate }
//   sessionStorage.setItem('AddJobModalParams', JSON.stringify(params))
// }
async function getDependency() {
  // Trigger a pom confirmation operation.
  await unref(dependencyRef)?.handleApplyPom();
  // common params...
  const dependency: { pom?: string; jar?: string } = {};
  console.log("unref(dependencyRef)", unref(dependencyRef))
  const dependencyRecords = unref(dependencyRef)?.dependencyRecords;
  const uploadJars = unref(dependencyRef)?.uploadJars;
  if (unref(dependencyRecords) && unref(dependencyRecords).length > 0) {
    Object.assign(dependency, {
      pom: unref(dependencyRecords),
    });
  }
  if (uploadJars && unref(uploadJars).length > 0) {
    Object.assign(dependency, {
      jar: unref(uploadJars),
    });
  }
  return dependency.pom === undefined && dependency.jar === undefined
    ? null
    : JSON.stringify(dependency);
}
// 自定义验证form表单
const checkFormValidation = async (formData: Recordable) => {
  isSubmitConfig.value = true
  if (formData.jobName === null || formData.jobName === undefined || formData.jobName === '') {
    isSubmitConfig.value = false
    createMessage.warning(t('flink.app.addAppTips.appNameIsRequiredMessage'))
    emit('addAttrFailed', 'attr');
    return
  }
  if (formData.executionMode == ExecModeEnum.KUBERNETES_APPLICATION) {
      const regexp = /^(?=.{1,45}$)[a-z]([-a-z0-9]*[a-z0-9])$/;
      if (!regexp.test(formData.jobName)) {
        isSubmitConfig.value = false
        createMessage.warning(t('flink.app.addAppTips.appNameValid'))
        emit('addAttrFailed', 'attr');
        return
      }
    }
    const params = { jobName: formData.jobName };
    if (formData.appId) {
      Object.assign(params, { id: formData.appId });
    }
    const res = await fetchCheckName(params);
    switch (parseInt(res)) {
      case 0:
        return Promise.resolve();
      case 1:
        isSubmitConfig.value = false
        createMessage.warning(t('flink.app.addAppTips.appNameNotUniqueMessage'));
        emit('addAttrFailed', 'attr');
        return 
      case 2:
        isSubmitConfig.value = false
        createMessage.warning(t('flink.app.addAppTips.appNameExistsInYarnMessage'));
        emit('addAttrFailed', 'attr');
        return 
      case 3:
        isSubmitConfig.value = false
        createMessage.warning(t('flink.app.addAppTips.appNameExistsInK8sMessage'));
        emit('addAttrFailed', 'attr');
        return 
      default:
        isSubmitConfig.value = false
        createMessage.warning(t('flink.app.addAppTips.appNameValid'));
        emit('addAttrFailed', 'attr');
        return 
    }
}

defineExpose({
  handleSubmit,
  isSubmitConfig,
  checkFormValidation
});
</script>
<template>
  <BasicDrawer class="app_controller app-drawer-margin" :showCancelBtn="false" :okText="t('common.closeText')" closeType="changeCloseHandlen" @register="registerDrawer"
    showFooter width="50%" @ok="handleSubmit" @close="handleSubmit">
    <template #title>
      <Icon icon="ant-design:user-add-outlined" />
      {{ getTitle }}
    </template>
    <BasicForm ref="basicForm" @register="registerForm" :schemas="props.schema" :initFormModel="initFormModel">
      <template #dependency="{ model, field }">
        <Dependency ref="dependencyRef" v-model:value="model[field]" :form-model="model" :flink-envs="flinkEnvs" />
      </template>
      <!-- <template #isSetConfig="{ model, field }">
        <Switch checked-children="ON" un-checked-children="OFF" v-model:checked="model[field]" />
        <SettingTwoTone
          v-if="model[field]"
          class="ml-10px"
          theme="twoTone"
          two-tone-color="#4a9ff5"
          @click="handleSQLConf(true, model)"
        />
      </template> -->
      <!-- <template #uploadJobJar>
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
      </template> -->
      <template #podTemplate>
        <PomTemplateTab
          ref="podTemplateRef"
          v-model:podTemplate="k8sTemplate.podTemplate"
          v-model:jmPodTemplate="k8sTemplate.jmPodTemplate"
          v-model:tmPodTemplate="k8sTemplate.tmPodTemplate"
        />
      </template>
      <!-- <template #args="{ model }">
        <ProgramArgs
          v-model:value="model.args"
          :suggestions="suggestions"
          @preview="(value) => openReviewDrawer(true, { value, suggestions })"
        />
      </template> -->
      <template #useSysHadoopConf="{ model, field }">
        <UseSysHadoopConf v-model:hadoopConf="model[field]" />
      </template>
    </BasicForm>
  </BasicDrawer>
</template>
<style lang="less">
@import url('../styles/Add.less');
</style>