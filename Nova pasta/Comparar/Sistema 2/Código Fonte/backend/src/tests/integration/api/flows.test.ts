import request from 'supertest';
import { app } from '../../../app';
import { sequelize } from '../../../database';
import User from '../../../models/User';
import Company from '../../../models/Company';
import Flow from '../../../models/Flow';
import jwt from 'jsonwebtoken';

describe('Flows API Integration Tests', () => {
  let authToken: string;
  let companyId: string;
  let userId: string;
  let testFlow: any;

  beforeAll(async () => {
    // Connect to test database
    await sequelize.authenticate();

    // Create test user and company
    const testCompany = await Company.create({
      name: 'Test Company',
      document: '12.345.678/0001-90'
    });

    const testUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'test123',
      companyId: testCompany.id,
      profile: 'admin'
    });

    companyId = testCompany.id;
    userId = testUser.id;

    // Generate JWT token
    authToken = jwt.sign(
      { id: userId, companyId, email: 'test@example.com', profile: 'admin' },
      process.env.APP_SECRET || 'test_secret'
    );
  });

  afterAll(async () => {
    // Clean up database
    await Flow.destroy({ where: { companyId } });
    await User.destroy({ where: { id: userId } });
    await Company.destroy({ where: { id: companyId } });
    await sequelize.close();
  });

  describe('POST /flows', () => {
    it('should create a new flow', async () => {
      const flowData = {
        name: 'Test Flow',
        description: 'Test Description',
        category: 'welcome',
        nodes: [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: 'Início' }
          },
          {
            id: 'message-1',
            type: 'sendMessage',
            position: { x: 300, y: 100 },
            data: {
              label: 'Send Message',
              config: {
                message: 'Hello World!',
                messageType: 'text'
              }
            }
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: 'Fim' }
          }
        ],
        edges: [
          {
            id: 'e1',
            source: 'start-1',
            target: 'message-1',
            type: 'default'
          },
          {
            id: 'e2',
            source: 'message-1',
            target: 'end-1',
            type: 'default'
          }
        ]
      };

      const response = await request(app)
        .post('/flows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(flowData)
        .expect(201);

      expect(response.body).toMatchObject({
        name: flowData.name,
        description: flowData.description,
        category: flowData.category,
        isActive: true,
        isPublished: false,
        version: 1,
        companyId
      });

      expect(response.body.nodes).toEqual(flowData.nodes);
      expect(response.body.edges).toEqual(flowData.edges);

      testFlow = response.body;
    });

    it('should return 400 for invalid flow data', async () => {
      const invalidData = {
        name: '', // Empty name should fail
        nodes: []
      };

      const response = await request(app)
        .post('/flows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 401 for unauthorized access', async () => {
      const flowData = {
        name: 'Unauthorized Flow',
        nodes: [],
        edges: []
      };

      await request(app)
        .post('/flows')
        .send(flowData)
        .expect(401);
    });

    it('should return 400 for duplicate flow name', async () => {
      const duplicateData = {
        name: testFlow.name, // Same name as existing flow
        nodes: [],
        edges: []
      };

      const response = await request(app)
        .post('/flows')
        .set('Authorization', `Bearer ${authToken}`)
        .send(duplicateData)
        .expect(400);

      expect(response.body.error).toContain('Já existe um fluxo com este nome');
    });
  });

  describe('GET /flows', () => {
    it('should list flows for the company', async () => {
      const response = await request(app)
        .get('/flows')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('flows');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
      expect(response.body).toHaveProperty('limit');

      expect(Array.isArray(response.body.flows)).toBe(true);
      expect(response.body.flows.length).toBeGreaterThan(0);
      expect(response.body.flows[0]).toMatchObject({
        name: testFlow.name,
        companyId
      });
    });

    it('should filter flows by category', async () => {
      const response = await request(app)
        .get('/flows?category=welcome')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.flows.forEach((flow: any) => {
        expect(flow.category).toBe('welcome');
      });
    });

    it('should filter flows by search term', async () => {
      const response = await request(app)
        .get('/flows?search=Test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      response.body.flows.forEach((flow: any) => {
        expect(flow.name.toLowerCase()).toContain('test');
      });
    });

    it('should paginate results', async () => {
      const response = await request(app)
        .get('/flows?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(1);
      expect(response.body.flows.length).toBeLessThanOrEqual(1);
    });
  });

  describe('GET /flows/:id', () => {
    it('should get a specific flow', async () => {
      const response = await request(app)
        .get(`/flows/${testFlow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: testFlow.id,
        name: testFlow.name,
        description: testFlow.description,
        companyId
      });
      expect(response.body.nodes).toEqual(testFlow.nodes);
      expect(response.body.edges).toEqual(testFlow.edges);
    });

    it('should return 404 for non-existent flow', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      await request(app)
        .get(`/flows/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 401 for unauthorized access', async () => {
      await request(app)
        .get(`/flows/${testFlow.id}`)
        .expect(401);
    });
  });

  describe('PUT /flows/:id', () => {
    it('should update a flow', async () => {
      const updateData = {
        name: 'Updated Test Flow',
        description: 'Updated Description',
        category: 'support'
      };

      const response = await request(app)
        .put(`/flows/${testFlow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject(updateData);
    });

    it('should update flow structure', async () => {
      const structureUpdate = {
        nodes: [
          ...testFlow.nodes,
          {
            id: 'delay-1',
            type: 'delay',
            position: { x: 400, y: 200 },
            data: {
              label: 'Wait 5 seconds',
              config: {
                delay: 5,
                delayUnit: 'seconds'
              }
            }
          }
        ],
        edges: testFlow.edges
      };

      const response = await request(app)
        .put(`/flows/${testFlow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(structureUpdate)
        .expect(200);

      expect(response.body.nodes).toHaveLength(testFlow.nodes.length + 1);
      expect(response.body.nodes.find((node: any) => node.id === 'delay-1')).toBeDefined();
    });

    it('should return 400 for invalid flow structure', async () => {
      const invalidStructure = {
        nodes: [
          {
            id: 'invalid-node',
            type: 'invalid-type'
          }
        ],
        edges: []
      };

      await request(app)
        .put(`/flows/${testFlow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidStructure)
        .expect(400);
    });
  });

  describe('POST /flows/:id/publish', () => {
    it('should publish a flow', async () => {
      const response = await request(app)
        .post(`/flows/${testFlow.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        isPublished: true,
        publishedAt: expect.any(String)
      });
      expect(response.body.version).toBe(testFlow.version + 1);
    });

    it('should return 400 for already published flow', async () => {
      await request(app)
        .post(`/flows/${testFlow.id}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });
  });

  describe('POST /flows/:id/test', () => {
    it('should test a flow', async () => {
      const testData = {
        contactNumber: '+5511999998888',
        contactName: 'Test Contact',
        variables: {
          name: 'John Doe',
          company: 'Test Company'
        }
      };

      const response = await request(app)
        .post(`/flows/${testFlow.id}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(testData)
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('executionId');
    });

    it('should return 400 for invalid test data', async () => {
      const invalidTestData = {
        contactNumber: 'invalid-number'
      };

      await request(app)
        .post(`/flows/${testFlow.id}/test`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(invalidTestData)
        .expect(400);
    });
  });

  describe('GET /flows/:id/analytics', () => {
    it('should get flow analytics', async () => {
      const response = await request(app)
        .get(`/flows/${testFlow.id}/analytics`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        flowId: testFlow.id,
        flowName: testFlow.name,
        totalExecutions: expect.any(Number),
        avgExecutionTime: expect.any(Number)
      });
      expect(response.body).toHaveProperty('executions');
    });

    it('should filter analytics by date range', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-12-31';

      const response = await request(app)
        .get(`/flows/${testFlow.id}/analytics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        flowId: testFlow.id
      });
    });
  });

  describe('POST /flows/:id/clone', () => {
    it('should duplicate a flow', async () => {
      const cloneData = {
        name: 'Cloned Test Flow'
      };

      const response = await request(app)
        .post(`/flows/${testFlow.id}/clone`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(cloneData)
        .expect(200);

      expect(response.body).toMatchObject({
        name: cloneData.name,
        companyId
      });
      expect(response.body.nodes).toEqual(testFlow.nodes);
      expect(response.body.edges).toEqual(testFlow.edges);
      expect(response.body.id).not.toBe(testFlow.id);
    });
  });

  describe('DELETE /flows/:id', () => {
    it('should delete a flow', async () => {
      await request(app)
        .delete(`/flows/${testFlow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify flow is deleted
      await request(app)
        .get(`/flows/${testFlow.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });

    it('should return 404 for non-existent flow', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';

      await request(app)
        .delete(`/flows/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('GET /flows/categories', () => {
    it('should list flow categories', async () => {
      const response = await request(app)
        .get('/flows/categories')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('GET /flows/stats', () => {
    it('should get flow statistics', async () => {
      const response = await request(app)
        .get('/flows/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        total: expect.any(Number),
        published: expect.any(Number),
        draft: expect.any(Number),
        active: expect.any(Number)
      });
      expect(response.body).toHaveProperty('byCategory');
    });
  });
});