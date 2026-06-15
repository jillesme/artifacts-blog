# Cloudflare Artifacts Video Script

## Title Options

- **A:** Your App Can Use Git Now with Cloudflare Artifacts!
- **B:** Git Is Not Just for Code Anymore with Cloudflare Artifacts

## Audience

Developers

## Takeaway

Artifacts are a new primitive for you and your agents to use the power of Git in your applications.

## Notes for Future Videos

- I’m skipping a bit over agents because I want this to make sense to humans who can then implement Artifacts in their agents.
- I’m also considering skipping event subscriptions to keep the mental model focused on Artifacts. I will hint at them near the outro, but it might be too much for one video. This would be a great follow-up.
- I’m not sure if I am showing any or much code. I probably will end up showing a few `env.ARTIFACTS` calls, but in the age of AI not everyone is interested in reading a lot of code in a video.

## Sources

- https://workers.cloudflare.com/products/artifacts/
- https://developers.cloudflare.com/artifacts

---

# Script

## Intro

Artifacts.

I’m not going to lie: when we released it, I didn’t understand it. Why would my applications need Git?

So I built a demo application to play around with Artifacts and wow. It blew my mind.

Holy shit. Artifacts are insane once you get them. Game changer.

Today I’ll show you the power of Artifacts. Let’s get right into it.

## Demo: Wiki Entries as Git Repositories

I’m going to create a new wiki entry, update it, and then show the commit.

This is crazy, right? Each wiki entry is a repository with commits.

Without Artifacts, you could either store each version of a blog post in the database, which is not efficient, or store diffs, but that gets complex fast. At that point, you’re basically reimplementing Git.

But wait, I said we can use Git, right? So can we easily fork?

Yes. Check it out.

I can fork the wiki entry, make a change, and now I have a new version that still has Git behind it.

Very cool. But wait, there’s more.

Actually, what I am about to show you next absolutely blew my mind.

What’s the first thing you do with an existing Git repository? You pull it.

And when you make changes?

Could it be?

## Demo: Clone, Edit, and Push

I’m going to mint a clone command, clone this Artifact locally, update the entry, commit the change, push it, and refresh the fork.

[Pause]

We are living in the future.

We now have the power of Git inside of your applications.

Here it’s a wiki entry, but you can see how this can apply to anything that uses the power of Git, like configuration updates, multi-user changes, and document conflicts.

And because it’s just Git, you can use any Git client to interact with Artifacts.

## Why Git?

Now you might be wondering: why Git?

Couldn’t we just create another API?

Think about agents and LLMs. They’re incredible at using Git.

There’s no need to teach your agents anything new or provide a skill file. They speak Git natively.

They know how to branch, commit, and push. Better than me, to be honest.

## Implementation Overview

Most of this code was written by my agent.

Let me walk you through the important parts to show you how easy it is.

The project has an Artifacts binding in `wrangler.jsonc`.

The main logic is in `artifacts.ts`.

It uses `node:fs`, which is supported in Workers, and `isomorphic-git` to interact with the repositories.

The important binding is `env.ARTIFACTS`.

From there, the app can get an Artifact, create a token, create a post, add files, commit changes, and read posts back out.

That’s the core idea: your application can create and manage Git repositories as part of its normal workflow.

## What Else Is Possible?

There is more to discover. We even have an event hub.

That means you can run actions when events happen.

For example, when I commit a change to a post, it could automatically run an agent to spell check it.

Can you see the possibilities?

Are you as excited as I am?

Artifacts are available today on the Workers paid plan.

Thanks for watching.
