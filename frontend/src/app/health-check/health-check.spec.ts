import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HealthCheck } from './health-check';

describe('HealthCheck', () => {
  let component: HealthCheck;
  let fixture: ComponentFixture<HealthCheck>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HealthCheck],
    }).compileComponents();

    fixture = TestBed.createComponent(HealthCheck);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
