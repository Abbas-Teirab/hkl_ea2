import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LocksTriggers } from './locks-triggers';

describe('LocksTriggers', () => {
  let component: LocksTriggers;
  let fixture: ComponentFixture<LocksTriggers>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LocksTriggers],
    }).compileComponents();

    fixture = TestBed.createComponent(LocksTriggers);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
