import fs from 'fs';
import yaml from 'yaml';

/**
 * Get API spec
 */
const file = fs.readFileSync('openapi.yaml', 'utf8');
const spec = yaml.parse(file);

export const getApiSpec = () => spec;