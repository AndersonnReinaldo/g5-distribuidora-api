import {rimraf} from 'rimraf';

/**
 * Apaga uma lista de pastas de forma recursiva.
 * @param folders Array com os caminhos das pastas a serem apagadas.
 */
export async function deleteFolders(folders: string[]): Promise<void> {
  for (const folder of folders) {
    try {
        await rimraf(folder);
      console.log(`Pasta ${folder} apagada com sucesso!`);
    } catch (err) {
      console.error(`Erro ao apagar a pasta ${folder}:`, err);
    }
  }
}
