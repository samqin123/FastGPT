import React, { useMemo, useState } from 'react';
import { Box, Grid, Flex, IconButton } from '@chakra-ui/react';
import { useRouter } from 'next/router';
import { delAppById, putAppById } from '@/web/core/app/api';
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
import MyIcon from '@fastgpt/web/components/common/Icon';
import Avatar from '@/components/Avatar';
import PermissionIconText from '@/components/support/permission/IconText';
import { useI18n } from '@/web/context/I18n';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import { useTranslation } from 'next-i18next';
import MyBox from '@fastgpt/web/components/common/MyBox';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useContextSelector } from 'use-context-selector';
import { AppListContext } from './context';
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
import { useFolderDrag } from '@/components/common/folder/useFolderDrag';
import dynamic from 'next/dynamic';
import type { EditResourceInfoFormType } from '@/components/common/Modal/EditResourceModal';
import MyMenu from '@fastgpt/web/components/common/MyMenu';
import {
  AppDefaultPermissionVal,
  AppPermissionList
} from '@fastgpt/global/support/permission/app/constant';
import {
  deleteAppCollaborators,
  getCollaboratorList,
  postUpdateAppCollaborators
} from '@/web/core/app/api/collaborator';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import AppTypeTag from '@/components/core/app/TypeTag';

const EditResourceModal = dynamic(() => import('@/components/common/Modal/EditResourceModal'));
const ConfigPerModal = dynamic(() => import('@/components/support/permission/ConfigPerModal'));

import type { EditHttpPluginProps } from './HttpPluginEditModal';
import { postCopyApp } from '@/web/core/app/api/app';
const HttpEditModal = dynamic(() => import('./HttpPluginEditModal'));

const ListItem = () => {
  const { t } = useTranslation();
  const { appT } = useI18n();
  const router = useRouter();
  const { myApps, loadMyApps, onUpdateApp, setMoveAppId, folderDetail, parentId } =
    useContextSelector(AppListContext, (v) => v);
  const [loadingAppId, setLoadingAppId] = useState<string>();

  const [editedApp, setEditedApp] = useState<EditResourceInfoFormType>();
  const [editHttpPlugin, setEditHttpPlugin] = useState<EditHttpPluginProps>();
  const [editPerAppIndex, setEditPerAppIndex] = useState<number>();
  const editPerApp = useMemo(
    () => (editPerAppIndex !== undefined ? myApps[editPerAppIndex] : undefined),
    [editPerAppIndex, myApps]
  );

  const { getBoxProps } = useFolderDrag({
    activeStyles: {
      borderColor: 'primary.600'
    },
    onDrop: async (dragId: string, targetId: string) => {
      setLoadingAppId(dragId);
      try {
        await putAppById(dragId, { parentId: targetId });
        loadMyApps();
      } catch (error) {}
      setLoadingAppId(undefined);
    }
  });

  const { openConfirm: openConfirmDel, ConfirmModal: DelConfirmModal } = useConfirm({
    type: 'delete'
  });
  const { runAsync: onclickDelApp } = useRequest2(
    (id: string) => {
      return delAppById(id);
    },
    {
      onSuccess() {
        loadMyApps();
      },
      successToast: t('common.Delete Success'),
      errorToast: t('common.Delete Failed')
    }
  );

  const { openConfirm: openConfirmCopy, ConfirmModal: ConfirmCopyModal } = useConfirm({
    content: appT('Confirm copy app tip')
  });
  const { runAsync: onclickCopy } = useRequest2(postCopyApp, {
    onSuccess({ appId }) {
      router.push(`/app/detail?appId=${appId}`);
      loadMyApps();
    },
    successToast: appT('Create copy success')
  });

  return (
    <>
      <Grid
        py={[4, 6]}
        gridTemplateColumns={['1fr', 'repeat(2,1fr)', 'repeat(3,1fr)', 'repeat(4,1fr)']}
        gridGap={5}
        alignItems={'stretch'}
      >
        {myApps.map((app, index) => (
          <MyTooltip
            key={app._id}
            h="100%"
            label={
              app.type === AppTypeEnum.folder
                ? t('common.folder.Open folder')
                : app.permission.hasWritePer
                  ? appT('Edit app')
                  : appT('Go to chat')
            }
          >
            <MyBox
              isLoading={loadingAppId === app._id}
              lineHeight={1.5}
              h="100%"
              py={3}
              px={5}
              cursor={'pointer'}
              border={'base'}
              boxShadow={'2'}
              bg={'white'}
              borderRadius={'md'}
              userSelect={'none'}
              position={'relative'}
              display={'flex'}
              flexDirection={'column'}
              _hover={{
                borderColor: 'primary.300',
                boxShadow: '1.5',
                '& .more': {
                  display: 'flex'
                },
                '& .chat': {
                  display: 'flex'
                }
              }}
              onClick={() => {
                if (app.type === AppTypeEnum.folder || app.type === AppTypeEnum.httpPlugin) {
                  router.push({
                    query: {
                      ...router.query,
                      parentId: app._id
                    }
                  });
                } else if (app.permission.hasWritePer) {
                  router.push(`/app/detail?appId=${app._id}`);
                } else {
                  router.push(`/chat?appId=${app._id}`);
                }
              }}
              {...getBoxProps({
                dataId: app._id,
                isFolder: app.type === AppTypeEnum.folder
              })}
            >
              <Flex alignItems={'center'} h={'38px'}>
                <Avatar src={app.avatar} borderRadius={'md'} w={'28px'} />
                <Box ml={3}>{app.name}</Box>
                {app.permission.hasManagePer && (
                  <Box
                    className="more"
                    position={'absolute'}
                    top={3.5}
                    right={4}
                    display={['', 'none']}
                  >
                    <MyMenu
                      Button={
                        <IconButton
                          size={'xsSquare'}
                          variant={'transparentBase'}
                          icon={<MyIcon name={'more'} w={'1rem'} />}
                          aria-label={''}
                        />
                      }
                      menuList={[
                        {
                          children: [
                            {
                              icon: 'edit',
                              label: '编辑信息',
                              onClick: () => {
                                if (app.type === AppTypeEnum.httpPlugin) {
                                  setEditHttpPlugin({
                                    id: app._id,
                                    name: app.name,
                                    avatar: app.avatar,
                                    intro: app.intro,
                                    pluginData: app.pluginData
                                  });
                                } else {
                                  setEditedApp({
                                    id: app._id,
                                    avatar: app.avatar,
                                    name: app.name,
                                    intro: app.intro
                                  });
                                }
                              }
                            },
                            ...(folderDetail?.type === AppTypeEnum.httpPlugin
                              ? []
                              : [
                                  {
                                    icon: 'common/file/move',
                                    label: t('common.folder.Move to'),
                                    onClick: () => setMoveAppId(app._id)
                                  }
                                ]),
                            ...(app.permission.hasManagePer
                              ? [
                                  {
                                    icon: 'support/team/key',
                                    label: t('permission.Permission'),
                                    onClick: () => setEditPerAppIndex(index)
                                  }
                                ]
                              : [])
                          ]
                        },
                        {
                          children: [
                            {
                              icon: 'copy',
                              label: appT('Copy one app'),
                              onClick: () =>
                                openConfirmCopy(() => onclickCopy({ appId: app._id }))()
                            }
                          ]
                        },
                        {
                          children: [
                            {
                              icon: 'core/chat/chatLight',
                              label: appT('Go to chat'),
                              onClick: () => {
                                router.push(`/chat?appId=${app._id}`);
                              }
                            }
                          ]
                        },
                        ...(app.permission.isOwner
                          ? [
                              {
                                children: [
                                  {
                                    type: 'danger' as 'danger',
                                    icon: 'delete',
                                    label: t('common.Delete'),
                                    onClick: () =>
                                      openConfirmDel(
                                        () => onclickDelApp(app._id),
                                        undefined,
                                        app.type === AppTypeEnum.folder
                                          ? appT('Confirm delete folder tip')
                                          : appT('Confirm Del App Tip')
                                      )()
                                  }
                                ]
                              }
                            ]
                          : [])
                      ]}
                    />
                  </Box>
                )}
              </Flex>
              <Box
                flex={1}
                className={'textEllipsis3'}
                py={2}
                wordBreak={'break-all'}
                fontSize={'mini'}
                color={'myGray.600'}
              >
                {app.intro || '还没写介绍~'}
              </Box>
              <Flex h={'34px'} alignItems={'flex-end'}>
                <Box flex={1}>
                  <PermissionIconText
                    defaultPermission={app.defaultPermission}
                    color={'myGray.600'}
                  />
                </Box>
                <AppTypeTag type={app.type} />
              </Flex>
            </MyBox>
          </MyTooltip>
        ))}
      </Grid>

      {myApps.length === 0 && <EmptyTip text={'还没有应用，快去创建一个吧！'} pt={'30vh'} />}

      <DelConfirmModal />
      <ConfirmCopyModal />
      {!!editedApp && (
        <EditResourceModal
          {...editedApp}
          title="应用信息编辑"
          onClose={() => {
            setEditedApp(undefined);
          }}
          onEdit={({ id, ...data }) => onUpdateApp(id, data)}
        />
      )}
      {!!editPerApp && (
        <ConfigPerModal
          avatar={editPerApp.avatar}
          name={editPerApp.name}
          defaultPer={{
            value: editPerApp.defaultPermission,
            defaultValue: AppDefaultPermissionVal,
            onChange: (e) => {
              return onUpdateApp(editPerApp._id, { defaultPermission: e });
            }
          }}
          managePer={{
            permission: editPerApp.permission,
            onGetCollaboratorList: () => getCollaboratorList(editPerApp._id),
            permissionList: AppPermissionList,
            onUpdateCollaborators: ({
              tmbIds,
              permission
            }: {
              tmbIds: string[];
              permission: number;
            }) => {
              return postUpdateAppCollaborators({
                tmbIds,
                permission,
                appId: editPerApp._id
              });
            },
            onDelOneCollaborator: (tmbId: string) =>
              deleteAppCollaborators({
                appId: editPerApp._id,
                tmbId
              })
          }}
          onClose={() => setEditPerAppIndex(undefined)}
        />
      )}
      {!!editHttpPlugin && (
        <HttpEditModal
          defaultPlugin={editHttpPlugin}
          onClose={() => setEditHttpPlugin(undefined)}
        />
      )}
    </>
  );
};

export default ListItem;
