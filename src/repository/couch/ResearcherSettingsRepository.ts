import { ResearcherSettingsInterface } from "../interface/RepositoryInterface"
import { ResearcherSettings } from "../../model/ResearcherSettings"
export class ResearcherSettingsRepository implements ResearcherSettingsInterface {
  public async _select(type: string, id?: string): Promise<{}> {
    return []
  }
  public async _insert(id: string, object: ResearcherSettings, choice?: string): Promise<string> {
    return ""
  }
  public async _get(id?: string): Promise<{}> {
    return {}
  }
}
