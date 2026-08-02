import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyFrontiers, deriveCandidateStatus, validateProductionQueue } from "../src/production-queue.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(await readFile(path.join(root, relativePath), "utf8"));
const [world, frontiers, annotations, queue] = await Promise.all([
  readJson("public/scenes/scenes.json"),
  readJson("public/scenes/production-frontiers.json"),
  readJson("public/scenes/manual-route-annotations.json"),
  readJson("public/scenes/staging-scenes.json"),
]);

const errors = validateProductionQueue(world, frontiers, annotations, queue);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  const { ready, blocked } = classifyFrontiers(world, frontiers, annotations, {
    fourPlusApprovedSceneIds: queue.batch.fourPlusApprovedSceneIds,
  });
  console.log(`${queue.batch.id}: ${queue.completedSceneIds.length}/${queue.batch.targetSceneCount} scenes promoted`);
  for (const candidate of queue.candidates) {
    console.log(`Active candidate: ${candidate.id} <- ${candidate.sourceSceneId}/${candidate.sourcePathId} (${deriveCandidateStatus(candidate, annotations)})`);
  }
  console.log(`Ready frontiers: ${ready.length}`);
  for (const frontier of ready) console.log(`  ${frontier.current_scene_id}/${frontier.path_id} at depth ${frontier.depth}`);
  console.log(`Blocked frontiers: ${blocked.length}`);
  for (const frontier of blocked) console.log(`  ${frontier.current_scene_id}/${frontier.path_id}: ${frontier.reason}`);
}
