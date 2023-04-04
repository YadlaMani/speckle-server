import { Roles } from '@speckle/shared'
import { Resolvers } from '@/modules/core/graph/generated/graphql'
import {
  createBranchAndNotify,
  deleteBranchAndNotify,
  updateBranchAndNotify
} from '@/modules/core/services/branch/management'
import {
  getPaginatedProjectModels,
  getProjectModelsTree
} from '@/modules/core/services/branch/retrieval'
import { authorizeResolver } from '@/modules/shared'
import { getServerOrigin } from '@/modules/shared/helpers/envHelper'
import { last } from 'lodash'

import { getViewerResourceGroups } from '@/modules/core/services/commit/viewerResources'
import {
  getPaginatedBranchCommits,
  getPaginatedStreamCommits
} from '@/modules/core/services/commit/retrieval'
import {
  filteredSubscribe,
  ProjectSubscriptions
} from '@/modules/shared/utils/subscriptions'

export = {
  Project: {
    async models(parent, args) {
      return await getPaginatedProjectModels(parent.id, args)
    },
    async model(_parent, args, ctx) {
      return ctx.loaders.branches.getById.load(args.id)
    },
    async modelsTree(parent, args) {
      return await getProjectModelsTree(parent.id, {
        search: args.filter?.search || undefined
      })
    },
    async modelChildrenTree(parent, { fullName }) {
      return await getProjectModelsTree(parent.id, {
        parentModelName: fullName
      })
    },
    async viewerResources(parent, { resourceIdString, loadedVersionsOnly }) {
      return await getViewerResourceGroups({
        projectId: parent.id,
        resourceIdString,
        loadedVersionsOnly
      })
    },
    async versions(parent, args) {
      return await getPaginatedStreamCommits(parent.id, args)
    }
  },
  Model: {
    async author(parent, _args, ctx) {
      return await ctx.loaders.users.getUser.load(parent.authorId)
    },
    async previewUrl(parent, _args, ctx) {
      const latestCommit = await ctx.loaders.branches.getLatestCommit.load(parent.id)
      const path = `/preview/${parent.streamId}/commits/${latestCommit?.id || ''}`
      return latestCommit ? new URL(path, getServerOrigin()).toString() : null
    },
    async childrenTree(parent) {
      return await getProjectModelsTree(parent.streamId, {
        parentModelName: parent.name
      })
    },
    async displayName(parent) {
      return last(parent.name.split('/'))
    },
    async versions(parent, args) {
      return await getPaginatedBranchCommits({
        branchId: parent.id,
        cursor: args.cursor,
        limit: args.limit,
        filter: args.filter
      })
    },
    async version(parent, args, ctx) {
      return await ctx.loaders.branches.getBranchCommit.load({
        branchId: parent.id,
        commitId: args.id
      })
    }
  },
  ModelsTreeItem: {
    async model(parent, _args, ctx) {
      return await ctx.loaders.streams.getStreamBranchByName
        .forStream(parent.projectId)
        .load(parent.fullName)
    },
    async children(parent) {
      return await getProjectModelsTree(parent.projectId, {
        parentModelName: parent.fullName
      })
    }
  },
  Mutation: {
    modelMutations: () => ({})
  },
  ModelMutations: {
    async create(_parent, args, ctx) {
      await authorizeResolver(
        ctx.userId,
        args.input.projectId,
        Roles.Stream.Contributor
      )
      return await createBranchAndNotify(args.input, ctx.userId!)
    },
    async update(_parent, args, ctx) {
      await authorizeResolver(
        ctx.userId,
        args.input.projectId,
        Roles.Stream.Contributor
      )
      return await updateBranchAndNotify(args.input, ctx.userId!)
    },
    async delete(_parent, args, ctx) {
      await authorizeResolver(
        ctx.userId,
        args.input.projectId,
        Roles.Stream.Contributor
      )
      return await deleteBranchAndNotify(args.input, ctx.userId!)
    }
  },
  Subscription: {
    projectModelsUpdated: {
      subscribe: filteredSubscribe(
        ProjectSubscriptions.ProjectModelsUpdated,
        async (payload, args, ctx) => {
          const { id: projectId, modelIds } = args
          if (payload.projectId !== projectId) return false

          await authorizeResolver(ctx.userId, projectId, Roles.Stream.Reviewer)
          if (!modelIds?.length) return true
          return modelIds.includes(payload.projectModelsUpdated.id)
        }
      )
    }
  }
} as Resolvers
