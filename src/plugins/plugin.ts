import { Address, ICommonQueryOptions, IApolloQueryOptions } from '../types'
import { Entity, IEntityRef } from '../entity'
import gql from 'graphql-tag'
import { Arc } from '../arc'
import { Observable } from 'rxjs'
import { createGraphQlQuery } from '../utils'
import { Plugins } from '.'
import { DAO } from '../dao'
import { DocumentNode } from 'graphql'

export interface IPluginState {
  id: string
  address: Address
  dao: IEntityRef<DAO>
  name: string
  paramsHash: string
  version: string
  canDelegateCall: boolean
  canUpgradeController: boolean
  canManageGlobalConstraints: boolean
  canRegisterPlugins: boolean
  numberOfQueuedProposals: number
  numberOfPreBoostedProposals: number
  numberOfBoostedProposals: number
}

export interface IPluginQueryOptions extends ICommonQueryOptions {
  where?: {
    address?: Address
    canDelegateCall?: boolean
    canRegisterPlugins?: boolean
    canUpgradeController?: boolean
    canManageGlobalConstraints?: boolean
    dao?: Address
    id?: string
    name?: string
    paramsHash?: string
    [key: string]: any
  }
}

export abstract class Plugin extends Entity<IPluginState> {

  public static baseFragment: { PluginFields: DocumentNode} = {
    PluginFields: gql`
    fragment PluginFields on ControllerScheme {
      id
      address
      name
      dao { id }
      canDelegateCall
      canRegisterSchemes
      canUpgradeController
      canManageGlobalConstraints
      paramsHash
      numberOfQueuedProposals
      numberOfPreBoostedProposals
      numberOfBoostedProposals
      version
      ${Object.values(Plugins).map(plugin => '...' + plugin.fragments.pluginParams.name).join('\n')}
    }
    ${Object.values(Plugins).map(plugin => plugin.fragments.pluginParams.fragment).join('\n')}
    `
  }

  public abstract coreState: IPluginState| undefined
  public abstract getPermissions(): Permissions

  public static search(
    context: Arc,
    options: IPluginQueryOptions = {},
    apolloQueryOptions: IApolloQueryOptions = {}
  ): Observable<Plugin[]> {
    let query
    if (apolloQueryOptions.fetchAllData === true) {
      query = gql`query SchemeSearchAllData {
        controllerSchemes ${createGraphQlQuery(options)}
        {
          ...PluginFields
        }
      }
      ${Plugin.baseFragment.PluginFields}`
    } else {
      query = gql`query SchemeSearch {
        controllerSchemes ${createGraphQlQuery(options)}
        {
            id
            address
            name
            dao { id }
            paramsHash
            version
            contributionRewardExtParams {
              id
              rewarder
            }
        }
      }`
    }

    const itemMap = (item: any): Plugin | null => {
      if (!options.where) {
        options.where = {}
      }

      return Plugins[item.name].itemMap(context, item)
    }

    return context.getObservableList(
      query,
      itemMap,
      apolloQueryOptions
    ) as Observable<Plugin[]>
  }
}