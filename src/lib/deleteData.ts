import { clearAllLocalData } from './storage'
import { idbDeleteAll } from './idb'

// Wipes everything the game keeps on this device ("delete my data" in
// settings), then reloads so no in-memory state is written back.
export async function deleteAllData(reload: () => void = () => window.location.reload()): Promise<void> {
  clearAllLocalData()
  await idbDeleteAll()
  reload()
}
