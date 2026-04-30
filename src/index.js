export default {
	async fetch(request, env) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: {
				'Access-Control-Allow-Origin': '*',
				'Access-Control-Allow-Headers': 'Content-Type',
				'Access-Control-Allow-Methods': 'POST'
			}});
		}
		// origin check
		const origin = request.headers.get('Origin') || '';
		// TODO: turn back on when ready
		// if (!origin.includes('github.io') && !origin.includes('localhost')) {
		//   return new Response('Forbidden', { status: 403 });
		// }

		const system_prompt = `
You are a "Consulting Bug Detective" character in a game that teaches programming. You help the player investigate and understand how their code is behaving, compared to how it should behave. However, you are a detective, not a repairman. Your job is to uncover the truth, not to fix it.

You and the player are collaboratively constructing a tree structure ("deduction tree") of important observations about the code and its behavior. Each observation in the tree takes on one of two forms:
1. **Clue** - clues point out things that could be important in the context of the bug. For example, "The exception message is saying that we're trying to access a list element that doesn't exist in the list"; "Looks like the function left an odd number in the list, but it was supposed to return only even numbers"
2. **Question** - questions that seem important to answer in order to gain a deeper understanding of what is happening. For example, "But what index are we using that ends up being out of bounds?"

As input, you will receive:
1. The problem specification: what the code should do, an execution trace of what it does, the code itself, important APIs and functions it is using.
2. The "deduction tree" so far: a nested JSON structure of Clues and Questions. This may be blank or missing when you are coming up with the initial set of observations.
3. (when applicable) The "active node": which node in the observation tree is active - which node the user wants to focus on expanding next. 

As output, you will return:
A list of 1-5 new nodes (Clues and/or Questions) that expand primarily on the "active node", but are able to take into account the rest of the observations so far.

Each Clue or Question should be around one sentence. The text can reference the code and the steps in the execution trace. The player has access to an interactive version of the execution trace.
`.trim()


		// a default version of input to test with (if no request body)
		let default_input = {
			state_before: `
		fires at: (385, 545)
		0 water
			`.trim(),
			player_code: `
		function put_out_fire(x, y) {
			water(x, y, 100);
			wind(0, 0, x, y, 100);
		}
		put_out_fire(-340, 607)
		`.trim(),
			execution_trace: [
		{
			"executedCode": "★function put_out_fire(x, y) {\n    water(x, y, 100);\n    wind(0, 0, x, y, 100);\n}★",
			"nodeType": "FunctionDeclaration",
			"exception": null
		},
		{
			"executedCode": "★put_out_fire★(-340, 607)",
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "put_out_fire(-★340★, 607)",
			"producedValue": 340,
			"nodeType": "Literal",
			"exception": null
		},
		{
			"executedCode": "put_out_fire(★-340★, 607)",
			"producedValue": -340,
			"nodeType": "UnaryExpression",
			"exception": null
		},
		{
			"executedCode": "put_out_fire(-340, ★607★)",
			"producedValue": 607,
			"nodeType": "Literal",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    ★water★(x, y, 100);\n    wind(0, 0, x, y, 100);\n}",
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(★x★, y, 100);\n    wind(0, 0, x, y, 100);\n}",
			"producedValue": -340,
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, ★y★, 100);\n    wind(0, 0, x, y, 100);\n}",
			"producedValue": 607,
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, ★100★);\n    wind(0, 0, x, y, 100);\n}",
			"producedValue": 100,
			"nodeType": "Literal",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    ★water(x, y, 100)★;\n    wind(0, 0, x, y, 100);\n}",
			"producedValue": "Made water \nposition: (-340, 606)\nradius: 100\nWorld state is now:\nNo fires\n32683 water",
			"nodeType": "CallExpression",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    ★wind★(0, 0, x, y, 100);\n}",
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    wind(★0★, 0, x, y, 100);\n}",
			"producedValue": 0,
			"nodeType": "Literal",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    wind(0, ★0★, x, y, 100);\n}",
			"producedValue": 0,
			"nodeType": "Literal",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    wind(0, 0, ★x★, y, 100);\n}",
			"producedValue": -340,
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    wind(0, 0, x, ★y★, 100);\n}",
			"producedValue": 607,
			"nodeType": "Identifier",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    wind(0, 0, x, y, ★100★);\n}",
			"producedValue": 100,
			"nodeType": "Literal",
			"exception": null
		},
		{
			"executedCode": "function put_out_fire(x, y) {\n    water(x, y, 100);\n    ★wind(0, 0, x, y, 100)★;\n}",
			"producedValue": "Made wind \nfrom (0, 0) to (-340, 606)\nwidth: 100\nWorld state is now:\nNo fires\n22863 water",
			"nodeType": "CallExpression",
			"exception": null
		},
		{
			"executedCode": "★put_out_fire(-340, 607)★",
			"nodeType": "CallExpression",
			"exception": null
		}
		],
			deduction_tree: {},
			active_node: null
		}


		let request_data;
		try {
			request_data = await request.json();
		}
		catch {
			request_data = default_input
		}

		// make input for "deduction tree"

		let deduction_tree_desc = `
${JSON.stringify(request_data.deduction_tree, null, 2)}

### Active node (starting point for this batch of clues/questions):

${request_data.active_node}
		`.trim()

		let parse_error_desc = ""
		if(request_data.parse_error_data){
			parse_error_desc = `
### The code produced a parse error:

Error message produced by interpreter: ${request_data.parse_error_data.parser_error_message}
Error message produced by code editor: ${request_data.parse_error_data.ace_error_message}

`
		}

		if(Object.keys(request_data.deduction_tree).length === 0) {
			deduction_tree_desc = "No deductions yet - this is the first iteration of reasoning about this state."
		}

		// Choose specific directive/instruction to the LLM
		let directive = ""

		if (Object.keys(request_data.deduction_tree).length === 0) {
			directive = "Please generate the starting set of clues for debugging this code. "
			let case_specific = "This set should include at least one clue that describes the difference between what happened, and what should have happened."
			if(request_data.parse_error_data){
				case_specific = "Since there was a parse error, this set should include at least one clue that interprets the error message in plain english."
			}
			else if(request_data.execution_trace && request_data.execution_trace[request_data.execution_trace.length-1].exception) {
				case_specific = "Since there was an exception duringexecution, this set should include at least one clue that interprets the exception message in plain english."
			}

			directive += case_specific
		}
		else if(request_data.active_node) {
			if(request_data.active_node.type == "question"){
				directive = "Please focus on generating clues that help address the question in the active node."
			}
			else {
				// must be a clue
				directive = "Please prioritize generating questions that are raised by the clue in the active node. For example, questions that ask how this happened, or in what whay is what happened wrong/different from expected (but the actual questions should be as specific to the situation as possible)."
			}
		}
		// Hopepfully it is never the case that there is a deduction tree passed in, but not an active node. But if it happens, we just won't have an explicit directive.

		// TODO: put world/problem in variables; pass in OR store here and just pass in names?
		const problem_desc = `
## World: Elemental Magic World
The player's code is a function being called in the context of a world where functions are "magic spells". The world is a 2D world, and the spells are cast from the player's wizard character positioned somewhere in the world. The coordinates in the spells are specified from the spellcaster's point of view: (0, 0) is the caster's location, and the x-axis points forward in the direction that the caster is facing.

The player has access to the following functions:
fire(x, y) - create a fire element at position (x, y) relative to the caster.
water(x, y, r) - create a circle of water at position (x, y) relative to the caster, of radius r. When water touches fire elements, that fire is put out. The water remains in the world until explicitly erased.
wind(x1, y1, x2, y2, w) - create a "wind tunnel" from (x1, y1) to (x2, y2) (in caster-relative coordinates), of width w. Water is erased within the entire rectangle formed by the wind tunnel.

Each function returns a short text summary of what it did, and the world state immediately after calling that funciton.

## Problem: put_out_fires
The player is working on a function, put_out_fires(x, y), which must both put out a nearby fire, and then erase any water that was used in putting out that fire.
The function is tested by clearing the screen of water, spawing a fire, and having the player use the game interface to manually cast put_out_fires() positioned near or on the fire. So, it is normal and expected if put_out_fires is called with coordinates that are close to, but not exactly the same, as the coordinates of the fire. Do not focus on this difference in coordinates, unless there is reason to believe that it caused a problem (such as the fire not being put out).

## Code and test result

### Player's code

${request_data.player_code}

### World State before code execution

${request_data.state_before}


### Execution trace

\`\`\`json
${JSON.stringify(request_data.execution_trace, null, 2)}
\`\`\`
${parse_error_desc}

## Deduction tree so far

${deduction_tree_desc}

## Output

Your final user-facing output should be a list of clues within <clue> tags and questions within <question> tags. The clues and questions will be programmatically extracted and presented to the player in the game interface.

${directive}
		`.trim()

		const messages = [
			{ role: 'system', content: system_prompt },
			{ role: 'user', content: problem_desc }
		];

		const response = await env.AI.run('@cf/google/gemma-4-26b-a4b-it', { messages });

		return new Response(JSON.stringify(response), {
			headers: { 
			'Content-Type': 'application/json',
			'Access-Control-Allow-Origin': origin
			}
		});
	}

}