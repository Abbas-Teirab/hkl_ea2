import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NodesConfiguration } from './nodes-configuration';

describe('NodesConfiguration', () => {
  let component: NodesConfiguration;
  let fixture: ComponentFixture<NodesConfiguration>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NodesConfiguration],
    }).compileComponents();

    fixture = TestBed.createComponent(NodesConfiguration);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
