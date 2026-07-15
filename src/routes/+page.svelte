<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { pb, getTeacherName, isTeacherLoggedIn } from '$lib/pocketbase';

  let email = '';
  let password = '';
  let name = '';
  let message = '';
  let busy = false;
  let teacherName = '';
  let authMode: 'sign-in' | 'create-account' = 'create-account';

  onMount(() => {
    teacherName = isTeacherLoggedIn() ? getTeacherName() : '';
  });

  function chooseAuthMode(mode: 'sign-in' | 'create-account') {
    authMode = mode;
    message = '';
  }

  async function signIn() {
    busy = true;
    message = '';
    try {
      await pb.collection('teachers').authWithPassword(email, password);
      teacherName = getTeacherName();
      await goto('/teacher');
    } catch (error) {
      message = error instanceof Error ? error.message : 'Could not sign in.';
    } finally {
      busy = false;
    }
  }

  async function signUp() {
    busy = true;
    message = '';
    try {
      await pb.collection('teachers').create({ email, password, passwordConfirm: password, name });
      await pb.collection('teachers').authWithPassword(email, password);
      teacherName = getTeacherName();
      await goto('/teacher');
    } catch (error) {
      message = error instanceof Error ? error.message : 'Could not create account.';
    } finally {
      busy = false;
    }
  }

  function openTeacher() {
    goto('/teacher');
  }
</script>

<svelte:head>
  <title>ClassPrint3D | Classroom 3D Print Management</title>
  <meta
    name="description"
    content="Give students one simple upload link and manage every classroom 3D print file in one place."
  />
</svelte:head>

<main class="landing-page">
  <nav class="site-nav" aria-label="Main navigation">
    <a class="brand" href="/" aria-label="ClassPrint3D home">
      <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
      <span>ClassPrint3D</span>
    </a>
    <button class="nav-sign-in" onclick={() => chooseAuthMode('sign-in')}>
      Sign in <span aria-hidden="true">&rarr;</span>
    </button>
  </nav>

  <section class="hero-section" aria-labelledby="hero-title">
    <div class="hero-copy">
      <div class="section-label"><span></span> Built for school makerspaces</div>
      <h1 id="hero-title">Every student file.<br /><em>Ready to print.</em></h1>
      <p>
        Make one upload link for your class. Students send their 3D models, and you get an organized
        queue that makes print day feel simple.
      </p>
      <div class="hero-actions">
        <a class="hero-cta" href="#get-started" onclick={() => chooseAuthMode('create-account')}>
          Create your free account <span aria-hidden="true">&rarr;</span>
        </a>
        <a class="how-it-works" href="#how-it-works">See how it works <span aria-hidden="true">&#9662;</span></a>
      </div>
      <div class="trust-line">
        <span class="student-dots" aria-hidden="true"><b></b><b></b><b></b></span>
        <span>No student accounts required</span>
      </div>
    </div>

    <div class="dashboard-preview" aria-label="Example teacher print queue">
      <div class="preview-glow"></div>
      <div class="preview-window">
        <div class="preview-topbar">
          <div class="mini-brand"><span class="mini-mark"></span> ClassPrint3D</div>
          <div class="preview-avatar">MR</div>
        </div>
        <div class="preview-content">
          <div class="preview-sidebar">
            <span class="sidebar-item active"><i></i> Print queue</span>
            <span class="sidebar-item"><i></i> Class links</span>
            <span class="sidebar-item"><i></i> Archive</span>
          </div>
          <div class="queue-panel">
            <div class="queue-heading">
              <div><small>YOUR PRINT QUEUE</small><strong>Period 4: Design Lab</strong></div>
              <button class="tiny-button">Share link</button>
            </div>
            <div class="queue-stats"><span>12 submissions</span><span>4 new today</span></div>
            <div class="submission-list">
              <div class="submission new"><span class="file-icon cube"></span><div><b>pencil_holder.stl</b><small>Jordan M. · 4 min ago</small></div><em>New</em></div>
              <div class="submission"><span class="file-icon ring"></span><div><b>keychain_v3.stl</b><small>Avery L. · Today</small></div><span class="ready-dot"></span></div>
              <div class="submission"><span class="file-icon cone"></span><div><b>bridge_model.stl</b><small>Samira P. · Yesterday</small></div><span class="ready-dot"></span></div>
            </div>
          </div>
        </div>
      </div>
      <div class="floating-upload"><span class="upload-icon">&#8593;</span><div><b>File received</b><small>pencil_holder.stl</small></div><span class="check">&#10003;</span></div>
    </div>
  </section>

  <section class="workflow-section" id="how-it-works" aria-labelledby="workflow-title">
    <div class="workflow-intro">
      <h2 id="workflow-title">From assignment to printer in three steps.</h2>
    </div>
    <div class="workflow-steps">
      <article class="workflow-step">
        <span class="step-number">01</span>
        <span class="step-icon link-icon" aria-hidden="true">&#8599;</span>
        <h3>Create a class link</h3>
        <p>Name your project and get a unique upload page in seconds.</p>
      </article>
      <article class="workflow-step">
        <span class="step-number">02</span>
        <span class="step-icon upload-step-icon" aria-hidden="true">&#8593;</span>
        <h3>Students send files</h3>
        <p>They add their name, model, and a note. No login to remember.</p>
      </article>
      <article class="workflow-step">
        <span class="step-number">03</span>
        <span class="step-icon queue-icon" aria-hidden="true">&#10003;</span>
        <h3>Review your queue</h3>
        <p>Every submission is in one calm, ready-to-print place.</p>
      </article>
    </div>
  </section>

  <section class="get-started" id="get-started" aria-labelledby="account-title">
    <div class="account-prompt">
      <h2>Spend less time sorting files and <em>more time teaching</em>.</h2>
      <p>Set up your classroom workspace in under a minute. Your students never need an account.</p>
    </div>

    <div class="auth-card">
      {#if teacherName}
        <div class="signed-in-card">
          <span class="account-check">&#10003;</span>
          <p>Signed in as</p>
          <h3>{teacherName}</h3>
          <button onclick={openTeacher}>Open your dashboard <span aria-hidden="true">&rarr;</span></button>
        </div>
      {:else}
        <div class="auth-tabs" role="tablist" aria-label="Account access">
          <button class:active={authMode === 'create-account'} onclick={() => chooseAuthMode('create-account')} role="tab">Create account</button>
          <button class:active={authMode === 'sign-in'} onclick={() => chooseAuthMode('sign-in')} role="tab">Sign in</button>
        </div>
        <form class="auth-form" onsubmit={(event) => { event.preventDefault(); authMode === 'sign-in' ? signIn() : signUp(); }}>
          <div>
            <h2 id="account-title">{authMode === 'sign-in' ? 'Welcome back' : 'Make your teacher account'}</h2>
            <p>{authMode === 'sign-in' ? 'Sign in to manage your print queue.' : 'No credit card or student accounts needed.'}</p>
          </div>
          {#if authMode === 'create-account'}
            <label>
              <span>Your name</span>
              <input bind:value={name} placeholder="Ms. Rivera" autocomplete="name" required />
            </label>
          {/if}
          <label>
            <span>School email</span>
            <input bind:value={email} type="email" placeholder="you@school.edu" autocomplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input bind:value={password} type="password" placeholder="At least 8 characters" autocomplete={authMode === 'sign-in' ? 'current-password' : 'new-password'} required minlength="8" />
          </label>
          <button class="auth-submit" disabled={busy}>{busy ? 'Please wait...' : authMode === 'sign-in' ? 'Sign in to dashboard' : 'Create free account'} <span aria-hidden="true">&rarr;</span></button>
          {#if message}<p class="auth-message" role="alert">{message}</p>{/if}
        </form>
      {/if}
    </div>
  </section>

  <footer class="landing-footer">
    <a class="brand" href="/"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><span>ClassPrint3D</span></a>
    <p>Made for the teachers who make things possible.</p>
  </footer>
</main>
