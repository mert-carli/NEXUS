import pytest
import json
from unittest.mock import patch, AsyncMock
from app.services.agent_service import agent_workflow, AgentState

import asyncio

def test_agent_workflow_state_transitions():
    asyncio.run(_test_agent_workflow_state_transitions())

async def _test_agent_workflow_state_transitions():
    # Mock embedding, vector search, and stream_chat
    with patch("app.services.agent_service.get_single_embedding", new_callable=AsyncMock) as mock_embed, \
         patch("app.services.agent_service.query_similar_chunks") as mock_query, \
         patch("app.services.agent_service.stream_chat") as mock_stream:
        
        mock_embed.return_value = [0.1, 0.2]
        mock_query.return_value = []
        
        # Simulate LLM outputting a plan then an edit
        async def fake_stream(*args, **kwargs):
            chunks = [
                "Here is my plan.\n",
                "<plan>\n",
                '{"goal": "Test goal", "steps": ["step 1", "step 2"]}',
                "\n</plan>\n",
                "Now for the edit:\n",
                "<edit file=\"test.py\">\n",
                "<search>old</search>\n",
                "<replace>new</replace>\n",
                "</edit>"
            ]
            for chunk in chunks:
                yield chunk
                
        mock_stream.side_effect = fake_stream
        
        events = []
        async for event in agent_workflow("proj-123", "fix it"):
            events.append(event)
            
        types = [e["type"] for e in events]
        
        # Verify state transitions
        state_events = [e for e in events if e["type"] == "state"]
        assert state_events[0]["status"] == "ANALYZING"
        assert state_events[1]["status"] == "PLANNING"
        
        # Check plan was parsed
        plan_events = [e for e in events if e["type"] == "plan"]
        assert len(plan_events) == 1
        assert plan_events[0]["goal"] == "Test goal"
        assert plan_events[0]["steps"] == ["step 1", "step 2"]
        
        # Check PROPOSING state emitted immediately after plan
        assert state_events[2]["status"] == "PROPOSING"
        
        # Check WAITING_APPROVAL state at the end
        assert state_events[-1]["status"] == "WAITING_APPROVAL"

        # Check step events were emitted
        step_events = [e for e in events if e["type"] == "step"]
        assert len(step_events) >= 4
