import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const dbName = process.env.D1_DATABASE_NAME || 'moepush-db';
const cloudflareApiToken = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = process.env.PROJECT_NAME || 'moepush';

const pagesEnv = process.env.CF_PAGES_ENV || 'preview'; // preview | production
const pagesBranch =
    process.env.CF_PAGES_BRANCH || (pagesEnv === 'production' ? 'main' : 'preview');
// Cloudflare treats deployments to `production_branch` as Production; everything else is Preview.
// If you don't want Production at all, set this to an unused branch name.
const pagesProductionBranch = process.env.CF_PAGES_PRODUCTION_BRANCH || 'production';
const pagesOutputDir = path.resolve('.vercel/output/static');

const setupWranglerConfig = () => {
    const wranglerExamplePath = path.resolve('wrangler.example.json');
    const wranglerConfigPath = path.resolve('wrangler.json');

    const wranglerConfig = fs.readFileSync(wranglerExamplePath, 'utf-8');
    const json = JSON.parse(wranglerConfig);
    json.d1_databases[0].database_name = dbName;
    json.name = projectName;
    fs.writeFileSync(wranglerConfigPath, JSON.stringify(json, null, 2));
};

const checkAndCreateDatabase = () => {
    let dbId;

    const getDatabaseId = () => {
        const dbList = execSync('pnpm wrangler d1 list --json').toString();
        const databases = JSON.parse(dbList);
        return databases.find((db: any) => db.name === dbName)?.uuid;
    }

    try {
        dbId = getDatabaseId();
    } catch (error) {
        console.error('Error listing databases:', error);
    }

    if (!dbId) {
        console.log(`Creating new D1 database: ${dbName}`);
        execSync(`pnpm wrangler d1 create "${dbName}"`, { stdio: 'inherit' });
        dbId = getDatabaseId();
        if (!dbId) {
            throw new Error('Failed to create database');
        }
    } else {
        console.log(`Database ${dbName} already exists`);
    }

    const wranglerConfigPath = path.resolve('wrangler.json');
    const wranglerConfig = JSON.parse(fs.readFileSync(wranglerConfigPath, 'utf-8'));
    wranglerConfig.d1_databases[0].database_id = dbId;
    fs.writeFileSync(wranglerConfigPath, JSON.stringify(wranglerConfig, null, 2));
};

const applyMigrations = () => {
    execSync(`pnpm wrangler d1 migrations apply "${dbName}" --remote`, { stdio: 'inherit' });
};

const createPagesSecret = () => {
    const envFilePath = path.resolve('.env');
    const envVariables = [
        `AUTH_SECRET=${process.env.AUTH_SECRET}`,
        `AUTH_GITHUB_ID=${process.env.AUTH_GITHUB_ID}`,
        `AUTH_GITHUB_SECRET=${process.env.AUTH_GITHUB_SECRET}`,
        `DISABLE_REGISTER=${process.env.DISABLE_REGISTER}`,
    ];
    fs.writeFileSync(envFilePath, envVariables.join('\n'));
    execSync(`pnpm wrangler pages secret bulk .env --project-name "${projectName}" --env "${pagesEnv}"`, { stdio: 'inherit' });
};

const deployPages = () => {
    console.log('Deploying to Cloudflare Pages...');
    execSync('pnpm pages:build', { stdio: 'inherit' });
    execSync(
        `pnpm wrangler pages deploy "${pagesOutputDir}" --project-name "${projectName}" --branch "${pagesBranch}" --no-bundle`,
        { stdio: 'inherit' }
    );
    console.log('Deployment completed successfully');
};

const checkProjectExists = async () => {
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${cloudflareApiToken}`,
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok && response.status === 404) {
            console.log(`Project ${projectName} does not exist. Creating...`);
            await createProject();
        } else {
            const data = await response.json() as { success: boolean, result?: { production_branch?: string } };
            if (!data.success) {
                throw new Error('Failed to read project info');
            }

            const currentProductionBranch = data.result?.production_branch;
            if (currentProductionBranch && currentProductionBranch !== pagesProductionBranch) {
                console.log(`Updating Pages production_branch: ${currentProductionBranch} -> ${pagesProductionBranch}`);
                await updateProject();
            } else {
                console.log(`Project ${projectName} already exists.`);
            }
        }
    } catch (error) {
        console.error('Error checking project existence:', error);
        throw error;
    }
};

const updateProject = async () => {
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
        {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${cloudflareApiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                production_branch: pagesProductionBranch,
            }),
        }
    );

    if (!response.ok) {
        throw new Error(`Error updating project: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as { success: boolean };
    if (!data.success) {
        throw new Error('Failed to update project');
    }
};

const createProject = async () => {
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${cloudflareApiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: projectName,
                production_branch: pagesProductionBranch,
            }),
        });

        if (!response.ok) {
            throw new Error(`Error creating project: ${response.statusText}`);
        }

        const data = await response.json() as { success: boolean, result: { name: string } };
        
        if (!data.success) {
            throw new Error('Failed to create project');
        }

        // 等待项目创建完成
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // 验证项目是否真正创建成功
        const verifyResponse = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${projectName}`,
            {
                headers: {
                    Authorization: `Bearer ${cloudflareApiToken}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!verifyResponse.ok) {
            throw new Error('Project creation verification failed');
        }

        const verifyData = await verifyResponse.json() as { success: boolean };
        if (!verifyData.success) {
            throw new Error('Project creation could not be verified');
        }

        console.log(`Project ${projectName} created and verified successfully`);
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
};

const main = async () => {
    try {
        setupWranglerConfig();
        await checkProjectExists();
        checkAndCreateDatabase();
        applyMigrations();
        createPagesSecret();
        deployPages();

        console.log('🎉 All deployment steps completed successfully!');
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
};

main();
