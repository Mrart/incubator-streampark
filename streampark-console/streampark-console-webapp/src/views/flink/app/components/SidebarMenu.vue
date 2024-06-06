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
import {defineComponent} from 'vue'
import { useI18n } from '/@/hooks/web/useI18n';
  export default defineComponent({
    name: 'SidebarMenu',
    props: {
      isAttrfailMsgActive: {
        type: Boolean,
        default: false,
      },
      isfailMsgActive: {
        type: Boolean,
        default: false,
      },
      configVisible: {
        type: Boolean,
        default: false
      },
      attrVisible: {
        type: Boolean,
        default: false
      }
    },
    emits: ['openDrawer'],
    setup(_, {emit}) {
      const { t } = useI18n();
      function openDrawer(type: string) {
        emit('openDrawer', type);
      }
      return {openDrawer, t}
    }
  })
</script>

<template>
  <ul class="streampark-page-wrapper-content-menu">
    <li :class="{ 'failMsg': isAttrfailMsgActive, 'active': attrVisible }" @click="openDrawer('attr')">{{t('flink.app.addDrawerMenu.attribute')}}</li>
    <li :class="{ 'failMsg': isfailMsgActive, 'active': configVisible }" @click="openDrawer('config')">{{t('flink.app.addDrawerMenu.configuration')}}</li>
  </ul>
</template>

<style lang="less">
.streampark-page-wrapper-content-menu {
  position: fixed;
  right: 10px;
  top: 65px;
  width: 25px;
    li {
      text-align: center;
      background: #dedede;
      border: 1px solid #dedede;
      border-radius: 5px 0 0 5px;
      cursor: pointer;
      padding: 5px 0;
      margin-bottom: 5px;
      word-break: break-all;
      &:hover {
        background-color: #1677ff;
        color: #fff;
      }
      &.failMsg {
        color: #ff4d4f;
        border-color: #ff4d4f;
        background-color: #fff;
        animation: myAnimation 1s ease-in-out;
      }
      &.active {
        color: #fff;
        background: #3c7eff;
      }
    }
    @keyframes myAnimation {
      0% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.5);
      }
      100% {
        transform: scale(1);
      }
    }
  }
</style>