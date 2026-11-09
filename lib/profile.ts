import Ajv from 'ajv';
import data from '../data/profile.json';
import schema from '../data/profile.schema.json';
const validate = new Ajv({allErrors: true}).compile(schema);
export function validateProfile(value: unknown): asserts value is typeof data {
  if (!validate(value)) throw new Error('Invalid profile schema');
  const p = value as typeof data;
  const ids = p.projects.map(project => project.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate project IDs');
  for (const skill of p.skills) {
    if (!skill.projectIds.length || skill.projectIds.some(id => !ids.includes(id))) throw new Error('Unsupported skill reference');
  }
  for (const project of p.projects) {
    new URL(project.repositoryUrl);
    for (const metric of project.metrics) {
      if (!project.evidence.some(item => item.reference === metric.evidenceReference)) throw new Error('Unsupported metric evidence');
    }
  }
}
validateProfile(data);
export const profile = data;
