import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { AuthService } from './auth.service';

/** Stands in for Supabase so the guards can be driven from a known state. */
class AuthServiceStub {
  authenticated = false;
  whenReady = () => Promise.resolve();
  isAuthenticated = () => this.authenticated;
  user = () => (this.authenticated ? { email: 'ban@vidu.com' } : null);
  signOut = () => Promise.resolve();
}

describe('route guards', () => {
  let auth: AuthServiceStub;
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    auth = new AuthServiceStub();
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: AuthService, useValue: auth }],
    });
    harness = await RouterTestingHarness.create();
  });

  it('sends a guest landing on / to the login page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2F');
  });

  it('funnels an unknown path through the wildcard to login', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/chat');

    // '/chat' does not exist yet, so the wildcard rewrites it to '/' before the
    // guard runs — returnUrl is '/', not '/chat'. Once real pages are added
    // they match first and their own URL is remembered.
    expect(TestBed.inject(Router).url).toBe('/login?returnUrl=%2F');
  });

  it('lets a signed-in user reach the home page', async () => {
    auth.authenticated = true;

    await harness.navigateByUrl('/');

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('keeps a signed-in user off the login page', async () => {
    auth.authenticated = true;

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('does not bounce a guest away from the login page', async () => {
    auth.authenticated = false;

    await harness.navigateByUrl('/login');

    expect(TestBed.inject(Router).url).toBe('/login');
  });
});
