#!/bin/bash

# Test script for POST /api/tasks endpoint
# Make sure your Next.js dev server is running (npm run dev)

echo "Testing POST /api/tasks..."
echo ""

# Test 1: Create a basic task
echo "Test 1: Creating a basic task"
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Test task from curl", "date": "12/25/2024", "completed": false}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || cat

echo ""
echo "---"
echo ""

# Test 2: Create a completed task
echo "Test 2: Creating a completed task"
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Completed task", "date": "12/25/2024", "completed": true}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || cat

echo ""
echo "---"
echo ""

# Test 3: Missing required field (should fail)
echo "Test 3: Missing date (should fail with 400)"
curl -X POST http://localhost:3000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"text": "Missing date"}' \
  -w "\nStatus: %{http_code}\n" \
  -s | jq '.' || cat

echo ""
echo "Done! Check your Google Sheet to see if the tasks were created."
